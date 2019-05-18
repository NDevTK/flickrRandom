update_rate = 1000; // Get new images every second :D
FlickrRND = {}
function Data(name, altdata) { // If local storage does not have the key return with altdata
    var item = FlickrRND.subject + "#" + name; // eg "cats#seed"
    if (data = FlickrRND.store.getItem(item)) {
        return data
    } else {
        FlickrRND.store.setItem(item, altdata);
        return altdata
    }
}

function RNDSeed() { // Creates seed
    return Math.floor(Math.random() * 20)
}

function InitFlickrRandom(subject = "", apikey, license = 10) { // Start Function
    FlickrRND.apikey = apikey;
    FlickrRND.license = license;
    FlickrRND.subject = encodeURI(subject);
    FlickrRND.store = window.localStorage;
    FlickrRND.seed = Data("seed", RNDSeed());
    FlickrRND.state = Data("state", 0);
    FlickrRND.SessionRNG = Math.seed(FlickrRND.seed);
    FlickrImageApi("1", "event");
}

function GetImage() {
    var state = parseInt(FlickrRND.state) + 1; // add one to state
    FlickrRND.store.setItem(FlickrRND.subject + "#state", state); // save state
    FlickrImageApi(order[state]); // Get
}

function CreateURL(page) { // Template
    return "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=" + FlickrRND.apikey + "+&format=json&per_page=1&extras=owner_name,url_o&page=" + page + "&text=" + FlickrRND.subject + "&jsoncallback=event&license=" + FlickrRND.license;
}

Math.seed = function(s) { // Magic seed function I did not make
    FlickrRND.seed = s;
    var mask = 0xffffffff;
    var m_w = (123456789 + s) & mask;
    var m_z = (987654321 - s) & mask;

    return function() {
        m_z = (36969 * (m_z & 65535) + (m_z >>> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >>> 16)) & mask;

        var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    }
}

function FlickrImageApi(page) { // Run JSONP
    var url = CreateURL(page);
    var s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
    s.remove();
}

function shuffle(a) { // Shuffle array using seed
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(SessionRNG() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function RandomOrder(pages) {
    var numbers = [...Array(pages)].map((_, i) => i + 1);
    return shuffle(numbers);
}

function event(data) { // Main callback from flickr (returns true if event)
    if(data.stat == "fail" && data.message){
		var error = "FlickrAPI: "+data.message;
		alert(error);
		console.log(error);
	}
    FlickrRND.pages = data.photos.pages; // Get total pages
    if (data.photos.page === 1) { // On first page start loop
        if (FlickrRND.state > FlickrRND.pages) {
            FlickrRND.state = 0; // If state is invalid reset to 0
        }
        var order = RandomOrder(FlickrRND.pages); // Put requests in an random order
        setInterval(GetImage, update_rate);
        if (FlickrRND.state > 0) {
            return false // Dont send event
        }
    }

    var event1 = new CustomEvent("onFlickrImage", {
        detail: {
            url: data.photos.photo[0].url_o,
            credit: data.photos.photo[0].owner
        }
    });
    window.dispatchEvent(event1);
    return true
}
