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

  // Play/pause midi
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



(function() {
  var dragStartY, dragPitch;

  // Insert a note when the staff is clicked, and begin dragging
  Gradus.keyBindings['staff_element.mousedown'] = function(e) {
    var selected;
    if (!this.hyperGradus && this.type != 'Note' && this.type != 'Rest')
      return;

    dragStartY = e.screenY;
    transposeOffset = 0;
    Gradus.startDragging();

    if (this.hyperGradus) {
      selected = new Score.Note({ pitch: this.opts.pitch,
                                  value: this.opts.value });
      Gradus.replace(this.chord, selected);
    } else {
      this.opts.type = 'note';
      this.opts.pitch = this.opts.pitch || 'A';
      selected = new Score.Note(this.opts);
      Gradus.replace(this, selected);
    }

    Gradus.setSelected(selected);
    dragPitch = selected.ord();
    e.preventDefault();
  };

  // Move selected note up/down the staff while dragging
  Gradus.keyBindings['score.mousemove'] = function(e) {
    if (!Gradus.isDragging())
      return;

    e.preventDefault();

    var selected = Gradus.getSelected();
    var x = Math.floor((e.screenY-dragStartY)/Score.Staff.LINE_HEIGHT);
    var newPitch = Score.Note.ordToPitch(dragPitch - x);
    if (newPitch != selected.opts.pitch) {
      selected.opts.pitch = newPitch;
      Gradus.replace(selected, selected);
    }
  };

  // Stop dragging when click is released
  Gradus.keyBindings['score.mouseup'] = function(e) {
    Gradus.stopDragging();
    e.preventDefault();
  };

})();
