const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/ratingsReviews");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Database is connected");
});

const reviewsSchema = new mongoose.Schema({
  review_id: { type: Number, required: true },
  product_id: { type: Number, required: true },
  rating: { type: Number, required: true },
  summary: String,
  recommend: { type: Boolean, required: true },
  response: String,
  body: { type: String, required: true },
  date: { type: Date, required: true },
  reviewer_name: { type: String, required: true },
  reviewer_email: { type: String, required: true },
  helpfulness: { type: Number, required: true },
  photos: [
    {
      id: Number,
      url: String,
    },
  ],
});

const metaSchema = new mongoose.Schema({
  product_id: Number,
  ratings: {
    1: Number,
    2: Number,
    3: Number,
    4: Number,
    5: Number,
  },
  recommended: {
    false: Number,
    true: Number,
  },
  characteristics: {
    Size: {
      id: Number,
      value: Number,
    },
    Width: {
      id: Number,
      value: Number,
    },
    Comfort: {
      id: Number,
      value: Number,
    },
    Quality: {
      id: Number,
      value: Number,
    },
  },
});

const Reviews = mongoose.model(
  "reviewsWithPhotos",
  reviewsSchema,
  "reviewsWithPhotos"
);
const MetaReviews = mongoose.model("MetaData", metaSchema, "MetaData");

/*---Review pipelines and query call --*/

const reviewFind = (params, cb) => {
  const { product_id, sort, count } = params;

  let pipelineHelp = [
    {
      $match: {
        product_id: Number(product_id),
      },
    },
    {
      $sort: {
        helpfulness: -1,
      },
    },
    {
      $limit: Number(count) || 5,
    },
  ];

  let pipelineDate = [
    {
      $match: {
        product_id: Number(product_id),
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
    {
      $limit: Number(count) || 5,
    },
  ];

  let pipelineRelevant = [
    {
      $match: {
        product_id: Number(product_id),
      },
    },
    {
      $sort: {
        date: -1,
        helpfulness: -1,
      },
    },
    {
      $limit: Number(count) || 5,
    },
  ];

  if (sort === "relevant" || sort === undefined) {
    Reviews.aggregate(pipelineRelevant, (err, items) => {
      cb(err, items);
    });
  } else if (sort === "helpfulness") {
    Reviews.aggregate(pipelineHelp, (err, items) => {
      cb(err, items);
    });
  } else if (sort === "date") {
    Reviews.aggregate(pipelineDate, (err, items) => {
      cb(err, items);
    });
  }
};

const checkCharacteristics = (params, cb) => {
  MetaReviews.find({ product_id: params }, (err, results) => {
    cb(err, results);
  });
};

const reviewAdd = (params, cb) => {
  const {
    product_id,
    rating,
    summary,
    body,
    recommend,
    name,
    email,
    photos,
    newLastIndex,
  } = params;

  Reviews.create(
    {
      review_id: newLastIndex,
      product_id: product_id,
      rating: rating,
      summary: summary,
      recommend: recommend,
      response: null,
      body: body,
      date: new Date(),
      reviewer_name: name,
      reviewer_email: email,
      helpfulness: 0,
      reported: false,
      photos: photos,
    },
    (err, result) => {
      cb(err, result);
    }
  );
};

const getLastIndex = (cb) => {
  Reviews.find()
    .sort({ review_id: -1 })
    .limit(1)
    .exec((err, result) => {
      cb(err, result);
    });
};

const addChars = (params, cb) => {
  const { characteristics, newLastIndex } = params;
  Object.keys(characteristics).map(async (keys) => {
    await MetaReviews.update(
      {
        id: keys.id,
      },
      {
        $push: {
          characteristics: {
            review_id: newLastIndex,
            characteristic_id: keys.id,
            value: keys.value,
          },
        },
      }
    );
  });
  cb(null, "Success on post!");
};

const reported = (params, cb) => {
  Reviews.update(
    {
      review_id: params,
    },
    {
      $set: { reported: true },
    }
  ).exec((err, results) => {
    cb(err, results);
  });
};

const helpful = (params, cb) => {
  Reviews.update(
    {
      review_id: params,
    },
    {
      $inc: {
        helpfulness: 1,
      },
    }
  ).exec((err, results) => {
    cb(err, results);
  });
};
module.exports = {
  reviewFind,
  reported,
  helpful,
  reviewAdd,
  addChars,
  getLastIndex,
  checkCharacteristics,
};
