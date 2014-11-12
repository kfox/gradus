
function getSharedABC() {
  var abc, urlSource = location.search.match(/s=([^&]+)/);
  if (urlSource) {
    abc = decodeURIComponent(urlSource[1]);
    return abc.replace('Cantus_Firmus', 'Cantus Firmus');
  }
  return null;
}

$(document).ready(function() {
  $('#controls button[name=share]').click(function() {
    var url, abc = Gradus.score.toABC();
    abc = abc.replace('Cantus Firmus', 'Cantus_Firmus');
    abc = encodeURIComponent(abc.replace(/[ \t]/g, ''));
    abc = abc.replace(/%7C/g, '|');
    url = location.origin + location.pathname + '?s='+abc;

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
