const API_KEY = "api_key=dc140afe3fd3a251c2fdf9dcd835be5c";
// The amount of images that should be presented per API call
const desiredImages = 25;
// The recently viewed list
var recentlyViewed = [];

$(document).ready(function () {

    // Hook the duck categories
    $('#general-ducks').click(function () {
        flickr_SearchTerm('Ducks');
    });

    $('#mallard-ducks').click(function () {
        flickr_SearchTerm('Mallard Duck');
    });
    $('#canvas-ducks').click(function () {
        flickr_SearchTerm('Canvas Back Duck');
    });

    $('#domestic-ducks').click(function () {
        flickr_SearchTerm('Domestic Duck');
    });

    $('#fulvous-duck').click(function () {
        flickr_SearchTerm('Fulvous Duck');
    });

    // Reset all the modal content, so its easily reuse-able
    $('#modal-close').click(function () {
        $('#modal-container').css('display', 'none');
        $('#modal-img').attr('src', '');
        $("#modal-comments-heading").html("");
        $("#modal-favorites").html("");
        $('.modal-comment').remove();
    });

});

// The flickr API handling is achieved through a pipeline of call backs
// SearchFlickr() --> getSizes() --> display()
flickr_SearchTerm('Ducks');

// Secondary entry point for Flickr API pipeline
function flickr_SearchTerm(input) {

    // Empty the album before adding new content in
    $("#img-album").empty();

    let requestStr = "https://www.flickr.com/services/rest/?method=flickr.photos.search&" + API_KEY + "&text=" + input + "&format=json&nojsoncallback=1";
    $.get(requestStr, function (data) {
        // fetchPhoto takes data which contains photo Ids and fetch the URL
        // for each photo
        for (let i = 0; i < desiredImages || i == data.photos.photo.length - 1; i++)
            flickr_GetSizes(data.photos.photo[i].id, data.photos.photo[i].title);
    });
}

// Get the size data
function flickr_GetSizes(photoID, title) {
    let getSizesStr = "https://api.flickr.com/services/rest/?method=flickr.photos.getSizes&format=json&nojsoncallback=1" + "&" + API_KEY + "&photo_id=" + photoID;

    $.get(getSizesStr, function (data) {

        // Automatically set the default to the small image, so if we dont find the larger one 
        // it uses the one it already has.
        var photo = {
            id: photoID,
            thumb: data.sizes.size[0].source,
            large_Square: data.sizes.size[0].source,
            large: data.sizes.size[0].source,
            title: title ? title : "Undefined",
        };

        // Check sizes for the keywords
        for (obj of data.sizes.size) {
            if (obj.source) {
                if (obj.label == "Large Square") photo.largeSquare = obj.source;
                if (obj.label == "Small") photo.thumb = obj.source;
                if (obj.label == "Large") photo.large = obj.source;
            }
        }

        flickr_Display(photo); // pass the data for display
    });
}

// finally, display it.
function flickr_Display(photo) {
    // Template HTML for thumbnail
    let template = "<span class=\"img-container\"> <img src=\"[PATH]\"> <div class=\"text-block\"> <p>[TITLE]</p> </div> </span>"

    // Its a string template, therefore replace the placeholders with the info thats needed.
    template = template.replace("[PATH]", photo.thumb).replace("[TITLE]", photo.title);

    // Create the template DOM object, add the full image url onto it, aswell as the image id.
    let thumbnail = $(template).attr('id', photo.id).attr('thumb', photo.thumb).attr('large_Square', photo.largeSquare).attr('large', photo.large);

    // append it to the image album
    thumbnail.appendTo("#img-album")

    // Add the modal_click as well as the refresh list function to the onClick
    $(thumbnail).click(function () {
        modal_Display($(this));
        recentlyViewed_UpdateList($(this));
    });
}

// Gets the comments object from the Flickr API, hands it down to modal_DisplayComments
function flickr_GetComments(photoid) {

    // template url
    let getcommentsURL = "https://api.flickr.com/services/rest/?method=flickr.photos.comments.getList&format=json&nojsoncallback=1" + "&" + API_KEY + "&photo_id=" + photoid;

    // Pipe it down to the display function
    $.get(getcommentsURL, function (data) {
        modal_DisplayComments(data);
    });
}

function flickr_GetLikes(photoid) {

    // template url
    let getfavoritesURL = "https://api.flickr.com/services/rest/?method=flickr.photos.getFavorites&format=json&nojsoncallback=1" + "&" + API_KEY + "&photo_id=" + photoid;

    $.get(getfavoritesURL, function (data) {
        // Show a heart if theres comments
        if (data.photo.person.length > 0) 
         $('#modal-favorites').html("<i class=\"fas fa-heart\"></i>" + data.photo.person.length);
        // else show a broken heart
        else 
        $('#modal-favorites').html("<i class=\"fas fa-heart-broken\"></i>" + data.photo.person.length);      
    });
}

// Formats, sanitises and displays comments from Flickr in the modal image box.
function modal_DisplayComments(data) {
    // Comment HTML template
    var commentTemplate = "<div class=\"modal-comment\" ><h3>[NAME]</h3><p>[COMMENT]</p></div>";

    // If there are comments, keep going
    if (data.comments.comment) {
        // Set sub heading to comments
        $("#modal-comments-heading").html("Comments");

        for (let i = 0; i < data.comments.comment.length; i++) {
            let template = commentTemplate;
            let comment = data.comments.comment[i];

            // Replace the template HTML with the commentor name and comment. 
            // Before entering comment sanitise it because people insert images and html in to their comments frequently
            template = template.replace("[NAME]", comment.authorname).replace("[COMMENT]", comment._content
                // for the square bracket images
                .replace(/(\[.*?\])/g, '')
                // for the html tags
                .replace(/(\<.*?\>)/g, '')
                // for the alternative html tags
                .replace(/(<[^>]*>)/g, ''));

            // Chuck it in the comments section
            $(template).appendTo('#modal-comments');
        }
        // else tell the user there aint no comments
    } else $("#modal-comments-heading").html("No comments");
}

// Call back function for displaying modal on thumbnail click
function modal_Display(thumbnail) {
    // Show the modal, Set the image in modal, set the text in modal.
    $('#modal-container').css('display', 'block');
    $('#modal-img').attr('src', $(thumbnail).attr('large'));

    // After the image has loaded, set the max height of the comments container 
    // relative to the image, because using max height would stop the image from scaling naturally
    $('#modal-img').on("load", function () {

        // switch image dimensions on image size
        if ($('#modal-img').height() > screen.height) 
        $('#modal-img').css('height', '90vh').css('width', 'auto');
        
        else
        $('#modal-img').css('height', 'auto').css('width', '60vw');

        // then set the comment container to fit
        $("#modal-comments").css("max-height", $('#modal-img').height());
    });

    // Set the modal heading to that of the thumbnail heading
    $('#modal-caption').text(thumbnail.find("p").text());

    // Get the comments as the modal opens
    flickr_GetComments(thumbnail.attr('id'));
    flickr_GetLikes(thumbnail.attr('id'));
}

// Update the recently viewed list.
function recentlyViewed_UpdateList(thumbnail) {
    // Filter out the value that we're adding back in
    recentlyViewed = recentlyViewed.filter(function (obj) {
        // If it isnt the same URL as the image that just got clicked, add it to the new list
        return (obj.find("img").attr("src") != thumbnail.find("img").attr("src"));
    });

    // Empty the HTML list
    $("#recently-viewed").empty();

    // Update the js list with the thumbnail we just removed
    recentlyViewed.push(thumbnail);

    // if the array length is larger than five, slice that foo up from the end-5 to end.
    if (recentlyViewed.length > 5)
        recentlyViewed = recentlyViewed.slice(recentlyViewed.length - 5, recentlyViewed.length);

    // Write the array backwards so the most recent image is shown first.
    for (let i = recentlyViewed.length; i > -1; i--) {
        // Clone and append boys, clone and append
        let viewed = $(recentlyViewed[i]).clone().appendTo("#recently-viewed");
        // The Modal Click event isnt passed when you clone it, 
        // so just redo the event hook for each of the recently viewed section.
        $(viewed).click(function () {
            modal_Display($(this));
            recentlyViewed_UpdateList($(this));
        });
    }
}