/* 
Table to schema hierarchy:

ReviewsWithPhotos
  -photos




MetaData
 -product_id
 -ratings
 -recommended
 -characteristics

 Order of aggregation:
  1. Create a Metadata document of characteristics and characteristics reviews combined
  2. Create a ratings document and group ratings with count
  3. Add ratings document to Metadata
  4. Create a recommended document and group recommended with true or false count
  5. Add recommended document to Metadata




*/

/*---creating db (used in mongo shell)
show dbs
use ratingsReviews
---*/

/*---importing csvs (used in bash shell)
mongoimport --db ratingsReviews --collection reviewsRaw --type csv --headerline --file /Users/irenehodge/Desktop/reviews.csv
mongoimport --db ratingsReviews --collection reviewPhotosRaw --type csv --headerline --file /Users/irenehodge/Desktop/reviews_photos.csv

mongoimport --db ratingsReviews --collection characteristicsRaw --type csv --headerline --file /Users/irenehodge/Desktop/characteristics.csv
mongoimport --db ratingsReviews --collection characteristicReviewsRaw --type csv --headerline --file /Users/irenehodge/Desktop/characteristic_reviews.csv

---*/

/*----- reviewsWithPhotos -----*/
//rename id review_id in reviewsRaw
db.reviewsRaw.updateMany({}, { $rename: { id: "review_id" } });

//index for combining
db.reviewsRaw.createIndex({ review_id: 1 });
db.reviewPhotosRaw.createIndex({ review_id: 1 });

//sort by product_id
db.reviewsRaw.aggregate(
  [
    { $sort: { product_id: 1 } },
    {
      $project: {
        product_id: 1,
      },
    },
    { $out: "productIds" },
  ],
  { allowDiskUse: true }
);

//combine tables
db.reviewsRaw.aggregate(
  [
    {
      $lookup: {
        from: "reviewPhotosRaw",
        localField: "review_id",
        foreignField: "review_id",
        as: "photos",
      },
    },

    { $out: "reviewsWithPhotos" },
  ],
  { allowDiskUse: true }
);

//look at current collection
db.reviewsWithPhotos.find().pretty();

//  //create product_id collection
//  db.reviewsWithPhotos.aggregate(
//     [
//      {$group:{_id: "$product_id"}},
//      {$out: 'product_id' }
// ],
// { allowDiskUse: true }
// )

// //add reviews to product_id
// db.product_id.createIndex({'index_id' : 1});
// db.reviewsWithPhotos.createIndex({'product_id': 1})

// db.product_id.aggregate([
//     { '$lookup' : {
//           from: 'reviewsWithPhotos',
//           localField: 'index_id',
//           foreignField: 'product_id',
//           as: 'reviews'
//       }
//   },

//   {$out: 'productWithReviews' }
// ],
//  { allowDiskUse: true },  )

//  //clean up colletion
//  db.reviewsWihPhotos.update(
//      {'product_id':{$exists: true}},
//      {$unset}
//  )

/*----metadata ---*/
//index both collections
db.characteristicReviewsRaw.createIndex({ characteristic_id: 1 });
db.characteristicsRaw.createIndex({ id: 1 });

//combine both collections in new collection MetaData
db.characteristicsRaw.aggregate(
  [
    {
      $lookup: {
        from: "characteristicReviewRaw",
        localField: "id",
        foreignField: "characteristic_id",
        as: "characteristics",
      },
    },
    { $out: "MetaData" },
  ],
  { allowDiskUse: true }
);

/*----ratings
  var ratings = {
    '1' : 0,
    '2' : 0,
    '3' : 0,
    '4' : 0,
    '5' : 0,
}
 
 ---*/

db.reviewsWithPhotos.aggregate(
  [{ $group: { _id: "$rating", Total: { $sum: 1 } } }, { $out: "ratings" }],
  { allowDiskUse: true }
);

/*---recommended
  var recommended = {
     'false': 0,
     'true': 0
 }
 
 ---*/

db.reviewsWithPhotos.aggregate(
  [
    ($group: { _id: "$recommend", Total: { $sum: 1 } }),
    { $out: "recommended" },
  ],
  { allowDiskUse: true }
);

/*----Adding into our instance

db.characteristicReviewsRaw.drop()
db.characteristicsRaw.drop()
db.reviewPhotosRaw.drop()
db.reviewsRaw.drop()

https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/

sudo hostnamectl set-hostname PUTYOURNAMEHERESAMPLE:Database or Server1

//how I wanted to do it:
mongodump --ssl \
    --host="ec2-13-58-190-210.us-east-2.compute.amazonaws.com" \
    --db=ratingsReviews \
    --out=SDC-output-file \
    --numParallelCollections 4  \
    --username=HR51.Irene \
    --password=abc0123 \
    --sslCAFile rds-combined-ca-bundle.pem


    //how I did it:
    mongodump --archive=ratingsReviews.archive --db=ratingsReviews

    //collection
    mongodump --archive=reviewsWithPhotos.archive --db=ratingsReviews --collection=reviewsWithPhotos
    scp -i rfp51-SDC-Go.pem ~/Desktop/reviewsWithPhotos.archive ubuntu@ec2-3-141-27-124.us-east-2.compute.amazonaws.com:/home/ubuntu
    ec2-18-188-59-180.us-east-2.compute.amazonaws.com

    //restore
    scp -i rfp51-SDC-Go.pem ~/Desktop/reviewsWithPhotos.archive ubuntu@ec2-18-188-59-180.us-east-2.compute.amazonaws.com:/home/ubuntu
    mongorestore --archive=reviewsWithPhotos.archive --host=localhost --port=27017 --drop

    scp -i rfp51-SDC-Go.pem ~/Desktop/ratingsReviews.archive ubuntu@ec2-13-58-190-210.us-east-2.compute.amazonaws.com:/home/ubuntu
   //run inside mongo port
    mongorestore --archive=ratingsReviews.archive --host=localhost --port=27017 --drop
    //mongorestore will only drop the existing collection if you use the --drop argument.

If you don't use --drop, all documents will be inserted into the existing collection, unless a document with the same _id already exists. 
Documents with the same _id will be skipped, they are not merged. So mongorestore will never delete or modify any of the existing data by default.

    //to start mongodb in instance
    sudo systemctl start mongod
    mongo
-----*/
