FlickrRND = {} // Main object
FlickrRND.fail_count = 0; // Failsafe if gets to 5 requests will stop being sent
FlickrRND.queue = [];
FlickrRND.bufferAmount = 4; // URLS to get from API per update_rate
FlickrRND.per_event = 4; // How many results from the event
FlickrRND.JSONP = true;
function Data(name, altdata) { // If local storage does not have the key return with altdata
    var item = FlickrRND.subject + "#" + name; // eg "cats#seed"
    if (data = FlickrRND.store.getItem(item)) {
        return data
    } else {
        FlickrRND.store.setItem(item, altdata);
        return altdata
    }
}

function RNGSeed(seed = Math.random) {
    FlickrRND.seed = seed;
    FlickrRND.store.setItem(FlickrRND.subject + "#" + "seed", seed);
    FlickrRND.SessionRNG = Math.seed(FlickrRND.seed);
}

function InitFlickrRandom(subject = "", apikey = "none", license = 10, update_rate = 3000) { // Start Function
    FlickrRND.apikey = apikey;
    FlickrRND.update_rate = update_rate;
    FlickrRND.license = license;
    FlickrRND.subject = encodeURI(subject);
    FlickrRND.store = window.localStorage;
    FlickrRND.state = Data("state", 0);
    FlickrImageApi("1", "event"); // Get first page (if state is > 1 it will just be to get the page count)
}

function GetImage() { // Get new image URL and callback to event
    if (FlickrRND.bufferAmount == FlickrRND.queue.length) return;
    FlickrRND.state = parseInt(FlickrRND.state) + 1; // add one to state
    if(!FlickrRND.order.hasOwnProperty(FlickrRND.state)) FlickrRND.state = 1;
    FlickrRND.store.setItem(FlickrRND.subject + "#state", FlickrRND.state); // save state
    FlickrImageApi(FlickrRND.order[FlickrRND.state]); // Get
}

function CreateURL(page) { // Template (may want to override this with your own API as to not shere your flickr API key)
    return "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=" + FlickrRND.apikey + "+&format=json&per_page=1&extras=owner_name,url_o&sort=relevance&page=" + page + "&text=" + FlickrRND.subject + "&jsoncallback=event&license=" + FlickrRND.license;
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

function SendEvent() {
    if (FlickrRND.queue.length == 0) return false; // If nothing in queue return
    var evurls = []; // Temp place to store URLs
    var evcredits = []; // Temp place to store Credits
    for (i = 0; i < FlickrRND.per_event; i++) {
        if(i > FlickrRND.queue.length -1) break;
        evurls.push(FlickrRND.queue[i].url)
        evcredits.push(FlickrRND.queue[i].credit)
        FlickrRND.queue.shift(); // Remove item added to event from queue
    }
    var event1 = new CustomEvent("onFlickrImage", {
        detail: {
            urls: evurls,
            credits: evcredits
        }
    });
    window.dispatchEvent(event1); // Send Event :D
    GetImage();
}

function getJSON(url) {
return fetch(url).then(response => response.json());
}

function FlickrImageApi(page) { // Run JSONP
    if(FlickrRND.fail_count >= 5) return; // Failsafe
    let url = CreateURL(page);
    if(FlickrRND.JSONP) {  
        let s = document.createElement("script");
        s.src = url;
        document.body.appendChild(s);
        s.remove();
        return
    }
    getJSON(url).then(result => event(result));
}

function shuffle(a) { // Shuffle array using seed
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(FlickrRND.SessionRNG() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function RandomOrder(pages) {
    if (pages > 10000) pages = 10000; // API limit (I think)
    var numbers = [...Array(pages)].map((_, i) => i + 1);
    return shuffle(numbers);
}

function event(data) { // Main callback from flickr (returns true if event)
    if (FlickrRND.bufferAmount == FlickrRND.queue.length) return;
    var photo = data.photos.photo[0];
    if(!photo) {
        GetImage();
        FlickrRND.fail_count += 1;
        return false;
    }

    if (FlickrRND.hasOwnProperty("skip") && FlickrRND.skip == photo.id) { // Check if has seen the same photo.id on page 1
        GetImage();
        FlickrRND.fail_count += 1;
        return false;
    }
    if (data.stat == "fail" && data.message) {
        FlickrRND.fail_count += 4;
        var error = "FlickrAPI: " + data.message;
        alert(error);
        console.log(error);
    }
    FlickrRND.pages = data.photos.pages; // Get total pages
    if (data.photos.page === 1) { // On first page start loop
        FlickrRND.skip = photo.id;
        RNGSeed();
        FlickrRND.order = RandomOrder(FlickrRND.pages); // Put requests in an random order
        GetImage();
        setInterval(SendEvent, FlickrRND.update_rate);
        if (FlickrRND.state > 0) return false // Dont send event
    }
    if (photo.hasOwnProperty("url_o") && photo.hasOwnProperty("owner")) { // Push to queue
        FlickrRND.queue.push({
            url: photo.url_o,
            credit: photo.owner
        });
        FlickrRND.fail_count = 0;
    }else{
    FlickrRND.fail_count += 1;
    }
    GetImage(); // New image
    return true
}
