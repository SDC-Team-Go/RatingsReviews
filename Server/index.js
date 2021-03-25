require("newrelic");
const { response } = require("express");
const express = require("express");
const app = express();

const db = require("../Database/index.js");
const port = 3000;
app.use(express.json());

/*---GET requests ---*/
app.get("/reviews", (req, res) => {
  const params = req.query;
  console.log(params);
  db.reviewFind(params, (err, results) => {
    if (err) {
      console.log("errored out of GET /reviews db.reviewFind");
      res.status(404).send(err);
    } else {
      console.log("success of GET /reviews db.reviewFind");
      let response = {
        product: params.product_id,
        page: 0,
        count: results.length,
        results: results,
      };
      res.status(200).send(response);
    }
  });
});

app.get("/reviews/meta", (req, res) => {
  const params = req.query;
  params.count = 100000;
  db.reviewFind(params, (err, results) => {
    if (err) {
      res.status(404).send(err);
    } else {
      let response = {
        product_id: params.product_id,
        ratings: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
        recommended: {
          false: 0,
          true: 0,
        },
        characteristics: {
          Size: {
            id: 0,
            value: 0,
          },
          Width: {
            id: 0,
            value: 0,
          },
          Comfort: {
            id: 0,
            value: 0,
          },
          Quality: {
            id: 0,
            value: 0,
          },
          Length: {
            id: 0,
            value: 0,
          },
          Fit: {
            id: 0,
            value: 0,
          },
        },
      };
      db.checkCharacteristics(params.product_id, (err, results2) => {
        if (err) {
          res.status(404).send(err);
        } else {
          for (var i = 0; i < results.length; i++) {
            response.ratings[results[i].rating]++;
            if (results[i].recommend === true || results[i].recommend === 1) {
              response.recommended.true++;
            } else if (
              results[i].recommend === false ||
              results[i].recommend === 0
            ) {
              response.recommended.false++;
            }
          }
          for (var j = 0; j < results2.length; j++) {
            var total = 0;
            var count = 0;
            var characteristic = results2[j]._doc;
            console.log(results2[j]._doc.characteristics);
            for (var k = 0; k < characteristic.characteristics.length; k++) {
              if (
                characteristic.characteristics[k].value === 0 ||
                characteristic.characteristics[k].id === 0
              ) {
                delete characteristic.characteristics[k].name;
              } else {
                total += characteristic.characteristics[k].value;
                count += 1;
              }
              // console.log("inside loop", characteristic.characteristics[k]);
              // // total += characteristic[k].value;
              // // console.log(total);
              // console.log(count);
              // count += 1;
            }
            // console.log("this is the start", results2[j]._doc.name);
            // console.log(response.characteristics[results2[j]._doc.name]);
            response.characteristics[characteristic.name].id =
              results2[j]._doc.id;
            response.characteristics[characteristic.name].value = total / count;
          }
          res.status(200).send(response);
        }
      });
    }
  });
});

/*---POST requests ---*/

app.post("/reviews", (req, res) => {
  let params = req.body;
  db.getLastIndex((err, result) => {
    if (err) {
      res.status(400).send(err);
    } else {
      params.newLastIndex = result[0].review_id + 1;
      console.log(params.newLastIndex);
      db.reviewAdd(params, (err, results2) => {
        if (err) {
          res.status(400).send(err);
        } else {
          db.addChars(params, (err, results3) => {
            if (err) {
              res.status(400).send(err);
            } else {
              res.status(201).send("Successfully added Post");
            }
          });
        }
      });
    }
  });
});

/*--PUT request ---*/

app.put("/reviews/:review_id/report", (req, res) => {
  let params = req.params.review_id;
  db.reported(params, (err, results) => {
    if (err) {
      res.status(404).send(err);
    } else {
      res.status(202).send(results);
    }
  });
});

app.put("/reviews/:review_id/helpful", (req, res) => {
  let params = req.params.review_id;
  db.helpful(params, (err, results) => {
    if (err) {
      res.status(404).send(err);
    } else {
      res.status(202).send(results);
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
