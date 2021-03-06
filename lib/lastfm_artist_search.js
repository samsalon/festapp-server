var LastFmNode = require('lastfm').LastFmNode;
var lastfm = new LastFmNode({
  api_key: '991ee611288dfc219b270731cfb04672',
  secret: '316936431b5bc14b67c586f604e90ac7'
});
var request = require('request');

var responsebody = ' ';

var model;

//Initialize the values of the model to empty strings and arrays.
function init_model() {
	model = {
	  'name': '',
	  'picture': '',
  	  'quote': '',
  	  'content': '',
  	  'featured': '',
  	  'status': '',
  	  'founded': '',
  	  'genres': [],
  	  'members': [],
  	  'albums': [],
  	  'highlights': [],
  	  'youtube': '',
  	  'spotify': '',
  	  'contact_info': '',
  	  'press_image': '',
  	  'credits': '',
  	  'place': ''
	}
}

// bind gathered data to model
function bind(json, uri) {
	var artist = model
	var index;
	var genres = [];
	artist.name = json.artist.name
	artist.picture = json.artist.image[4]['#text']
	artist.content = remove_links_from_string(json.artist.bio.summary)
	// here we parse genres so we only get names.
	// if genrelist is empty do nothing to skip errors

    var empty_genres = json.artist.tags.tag==undefined
	if (!empty_genres) {
	  for (index = 0; index < json.artist.tags.tag.length; ++index){
	    genres[index] = json.artist.tags.tag[index].name;
	  }
	} 

	artist.genres = genres;
	artist.spotify = uri
	artist.albums = json.albums;

	// write a json response
	responsebody.type('application/json; charset=utf-8');
	responsebody.json(artist)
	responsebody.end();
}

function remove_links_from_string(string){

	//First: remove all parts that are in HTML <a> tags.
	var temp = string;
	var start_index = -1;
	var end_index = -1;
	var substr;
	while (temp.indexOf('<a') > -1){
		start_index = temp.indexOf('<a');
		substr = temp.substring(start_index);
		//we add the length of "a>" and ending dot from lastfm.
		end_index = substr.indexOf('a>') +2;
		if (end_index > -1){
			temp = temp.substring(0,start_index) + substr.substring(end_index);
		} else {
			temp = temp.substring(0,start_index);
		}
	}

	//Remove empty parenthesis from the string
	temp = temp.replace(/\(\s*\)/g,'');
	temp = temp.replace(/\s(\.)/g, '.');

	//Second: Remove all line-breaks.
	
	temp = temp.replace(/\t|\r?\n|\r/g,' ');

	//2.5: Remove lastfm's ending dot.

	temp = temp.trim();
	temp = temp.substring(0,temp.length-1);

	//Third: Remove extra whitespace from start and beginning.

	temp = temp.trim();
	return temp;
}


// flow: search lastfm api -> get spotify uri/albums -> bind model
function search(artist, res) {
  responsebody = res;
  init_model();
  var request = lastfm.request("artist.getInfo", {
    artist: artist, 
    handlers: { success: function(data) { 
      request = data;
	  get_spotify_uri(data);
	},
	error: function(error) { 
	  console.log("Error: " + error.message);
	  responsebody.json(model);
	  responsebody.end();
    }
    }
  });
};


function get_lastfm_formed(artist) {

}

// get spotify data
function get_spotify_uri(artistjson) {
	var artist = artistjson.artist.name
	

	// request artist from api
	request('http://ws.spotify.com/search/1/artist.json?q=artist:'+artist, function (error, response, body) {
	
		// if Spotify api can't find match - this happens often, as lastfm is more expansive
	  if (JSON.parse(body).info.num_results == 0) {
	  	artistjson.albums = '';
	  	bind(artistjson, uri);
	  } else if (!error && response.statusCode == 200) {
    	    response = body
    	    var uri = JSON.parse(body).artists[0].href

    	    request('http://ws.spotify.com/lookup/1/.json?uri='+uri, function (error, response, body) {
    	      if(!artist==JSON.parse(body).artist.name) {
    	      	artistjson.albums = '';
    	      	bind(artistjson, '');
    	      }

    		  if (!error && response.statusCode == 200) {
		        request('http://ws.spotify.com/lookup/1/.json?uri=' + uri + '&extras=album', function (error, response, body) {
			      response = body;

			      var albumsinfo = JSON.parse(body).artist.albums;
			      var albums = [];
			      var index;

			      // parse only albumname from data.
			      for (index = 0; index < albumsinfo.length; ++index){
			          albums[index] = albumsinfo[index].album.name;
			      }
			      artistjson.albums = albums;

			      // proceed to bind lastfm json and spotify data 
			      bind(artistjson, uri);
		        });
		      };
		     });
		   } else {
			bind('','')
		   }
	});
}


// exposed methods
module.exports = {
  search: function (artist, res) {
    return search(artist, res)
  }
};
