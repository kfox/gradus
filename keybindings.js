$(document).ready(function() {

  // Toggle HYPER GRADUS mode
  key('tab', function(e) {
    e.preventDefault();

    var controls = $('#controls input[name=hyper]');
    var state = controls.filter(':checked').val();
    var newState = controls.
      filter('[value='+(state == 'on' ? 'off' : 'on')+']').
      prop('checked', true).val();

    (newState == 'on') ? Gradus.Hyper.On() : Gradus.Hyper.Off();
  });

  // Remove most recently touched note, replacing it with a rest
  key('backspace', function(e) {
    e.preventDefault();

    var selected = Gradus.getSelected();
    if (!selected)
      return;

    var rest = new Score.Rest({ value: selected.opts.value });
    Gradus.replace(selected, rest);

    Gradus.stopDragging();
    Gradus.setSelected(null);
  });

  key('space', function(e) {
    e.preventDefault();

    if (!MIDI.loaded)
      return;

    if (MIDI.Player.playing)
      return MIDI.Player.stop();

    var data = new Score.MidiWriter(Gradus.score).writeMidi();
    MIDI.Player.loadFile(data);
    MIDI.Player.start();
  });
});
