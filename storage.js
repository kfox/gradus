
$(document).ready(function() {
  var ui = $('#controls select[name=source]');
  ui.change(function(e) {
    var selected = $(this).find('option:selected');
    Gradus.load($(selected).data('abc'));
  });

  var library = $('<optgroup label="Cantus Firmi">');
  $('#library >*').each(function() {
    var option = $('<option>');
    option.text($(this).data('name'));
    option.data('abc', $(this).text());
    library.append(option);
  });

  var saved = $('<optgroup label="Saved">');
  for (var key, option, i=0; i < localStorage.length; ++i) {
    key = localStorage.key(i);
    if (!key.match(/^saved-/))
      continue;

    var option = $('<option>');
    option.text(key.replace(/^saved-/, ''));
    option.data('abc', localStorage[key]);
    saved.append(option);
  }
  ui.append(library, saved);

  $('#controls button[name=save]').click(function() {
    var name = new Date().toLocaleString();
    var abc = Gradus.score.toABC();
    localStorage['saved-'+name] = abc;

    var option = $('<option>');
    option.text(name);
    option.data('abc', abc);
    saved.append(option);
    option.prop('selected', true);
  });
});
