var fs = require('fs');
//load cert
const ca = fs.readFileSync('./certs/brightdata_ca.crt');

//Bright Data Access
const brd_user = 'hl_d3b8cf29';
const brd_zone = 'residential_proxy1';
const brd_passwd = 'z2kmdxamt6yv';
const brd_superpoxy = 'brd.superproxy.io:33335';
const brd_connectStr =
  'brd-customer-' +
  brd_user +
  '-zone-' +
  brd_zone +
  ':' +
  brd_passwd +
  '@' +
  brd_superpoxy;

//Switch between brd_test_url to get a json instead of txt response:
// const brd_test_url = 'https://geo.brdtest.com/mygeo.json';

const brd_test_url = 'https://geo.brdtest.com/welcome.txt';

require('request-promise')({
  url: brd_test_url,
  proxy: 'http://' + brd_connectStr,
  //add cert in the request options
  ca: ca,
}).then(
  function (data) {
    console.log(data);
  },
  function (err) {
    console.error(err);
  },
);
