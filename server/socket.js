module.exports = (server) => {
  const io = require('socket.io')(server);
  const moment = require('moment');
  const config = require('../config');
  const axios = require('axios');

  const searches = [];

  io.on('connection', (socket) => {
    socket.on('search-foods', (terms) => {
      const searchTerms = {
        cuisine: terms.cuisine,
        location: terms.location,
        limit: terms.limit,
        time: moment(new Date()).format('h:mm a'),
      };

      // if (searches.length > 0) {
      //   searches.forEach(item => {
      //     if (item.cuisine.toLowerCase() === terms.cuisine.toLowerCase()) {
      //       console.log('failed')
      //     } else {
      //       console.log('run 1')
      //       searches.push(searchTerms)
      //       console.log("pushing: " + searchTerms.cuisine + " location :" +
      // searchTerms.location + " time:" + searchTerms.time)
      //       io.emit('search-history', searches)
      //     }
      //   })
      // } else {
      //   console.log('run 2')
      //   console.log("pushing: " + searchTerms.cuisine + " location :" +
      // searchTerms.location + " time:" + searchTerms.time)
      //   searches.push(searchTerms)
      //   io.emit('search-history', searches)
      // }

      axios.get(config.url_search, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${config.api_key}`
        },
        params: {
          location: terms.location,
          term: terms.cuisine,
          limit: terms.limit,
        }
      })
        .then((response) => {
          console.log('emit successful-search');
          searches.push(searchTerms);
          io.emit('search-history', searches);
          const businessData = formatResultsList(response.data.businesses);
          io.emit('successful-search', businessData);
        })
        .catch((error) => {
          console.error(error);
        });
    });


    socket.on('search-reviews', (id) => {
      axios.get(`${config.url}${id}/reviews`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${config.api_key}`
        }
      })
        .then((response) => {
          console.log('reviews!');
          const reviewData = response.data.reviews;
          reviewData.forEach((review) => {
            if (review.user.image_url == null) {
              review.user.image_url = `http://via.placeholder.com/75?text=${review.user.name}`;
            }
          });
          io.emit('successful-reviews', reviewData);
        })
        .catch((error) => {
          console.error(error);
        });
    });

    socket.on('redo-search', (redo) => {
      axios.get(config.url_search, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${config.api_key}`
        },
        params: {
          location: redo.location,
          term: redo.cuisine,
          limit: redo.limit
        }
      })
        .then((response) => {
          const businessData = formatResultsList(response.data.businesses);
          io.emit('successful-search', businessData);
        })
        .catch((error) => {
          console.error(error);
        });
    });
  });
};

const formatResultsList = (results) => {
  const formatedResults = [];
  const defaultFields = {
    id: '',
    image_url: 'http://via.placeholder.com/245x180',
    name: 'Default Name',
    rating_url: '/rating/0.png',
    location: '',
    phone: '',
    review_count: 0,
    distance: '0 KM',
    categories: ''
  };

  const hasUndefined = (...args) => args.some(arg => arg === undefined);

  results.forEach((restaurant) => {
    const result = Object.assign({}, defaultFields);

    result.id = restaurant.id;

    if (!hasUndefined(restaurant.image_url)) {
      result.image_url = restaurant.image_url;
    }
    if (!hasUndefined(restaurant.name)) {
      result.name = restaurant.name;
    }
    if (!hasUndefined(restaurant.rating)) {
      result.rating_url = `/rating/${restaurant.rating}.png`;
    }
    if (!hasUndefined(
      restaurant.location.address1, restaurant.location.city,
      restaurant.location.state, restaurant.location.zip_code
    )) {
      result.location = `${restaurant.location.address1}, ${restaurant.location.city}, 
      ${restaurant.location.state}, ${restaurant.location.zip_code}`;
    }
    if (!hasUndefined(restaurant.phone)) {
      result.phone = restaurant.phone;
    }
    if (!hasUndefined(restaurant.review_count)) {
      result.review_count = restaurant.review_count;
    }
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(restaurant.distance)) {
      result.distance = `${(parseFloat(restaurant.distance) / 1000).toFixed(2)} km`;
    }
    if (!hasUndefined(restaurant.categories, restaurant.price)) {
      result.categories += restaurant.price;
      restaurant.categories.forEach((category) => {
        result.categories += ` - ${category.title}`;
      });
    }
    formatedResults.push(result);
  });
  return formatedResults;
};
