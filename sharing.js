
function getSharedABC() {
  var urlSource = location.search.match(/s=([^&]+)/);
  if (urlSource)
    return decodeURIComponent(urlSource[1]);
  return null;
}

$(document).ready(function() {
  $('#controls button[name=share]').click(function() {
    var abc = Gradus.score.toABC();
    var url = location.origin + location.pathname + '?s='+encodeURIComponent(abc);

    $('#share-url-holder').slideDown(150).
      find('input').val(url);
    $('#share-url-holder input').select();
  });

  $(document).click(function(e) {
    if (!$(e.target).is('#controls button[name=share], #share-url-holder *')) {
      $('#share-url-holder').slideUp(150);
    }
  });
});
