import leaflet from "leaflet";
import DBHelper from "./dbhelper";
import registerServiceWorker from "./register-service-worker";
let newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  registerListeners();
  registerServiceWorker();
});

function registerListeners() {
  document.getElementById("review-form")
  .addEventListener("submit", addReview);
}

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      newMap = leaflet.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      leaflet.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoibWFyemVsaW4iLCJhIjoiY2prMmc3YjB4MHBxYTNxbXF1dXgzZ3J2MCJ9.qP9LUWOJx6AN9w5_JB6MuA',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb(restaurant);
      DBHelper.mapMarkerForRestaurant(restaurant, newMap);
    }
  });
}  
 
/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML(restaurant);
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  const [src, srcset] = DBHelper.imageUrlForRestaurant(restaurant);
  image.src = src;
  image.srcset = srcset;
  image.sizes = `
    (min-width: 840px) 800px,
    calc(100vw - 40px)`;
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML(restaurant.operating_hours);
  }
  // fill reviews
  fillReviewsHTML(restaurant.id);
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (id) => {
  DBHelper.fetchRestaurantReviewsById(id, (error, reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.className = 'comments-title';
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  })
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.className = 'comment-container';
  const name = document.createElement('p');
  name.className = 'comment-reviewer';
  name.innerHTML = review.name;
  li.appendChild(name);
  const creationDate = new Date(review.createdAt).toLocaleString();

  const date = document.createElement('p');
  date.className = 'comment-date';
  date.innerHTML = creationDate;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'comment-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'comment-comments';
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function addReview(event) {
  event.preventDefault();
  const id = Number(getParameterByName('id'));
  const {name, rating, text} = this;
  const newReview = {
    name: name.value,
    comments: text.value,
    rating: rating.value,
    restaurant_id: id,
    createdAt: Date.now(),
  };
  const html = createReviewHTML(Object.assign({}, newReview, {date: "now"}));
  const ul = document.getElementById('reviews-list');
  ul.appendChild(html);
  DBHelper.publishReview(id, newReview, () => {
    console.log("update done")
  });
}
