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

    var below = selected.part.below(selected);
    below && below.removeText();

    var rest = selected.change({ type: 'Rest' });
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

    var midi = new Score.MidiWriter(Gradus.score).writeMidi();
    MIDI.Player.loadFile(midi.file);
    MIDI.Player.start();

    Gradus.animator = new Score.MidiAnimator(midi.events);
    Gradus.animator.animate(MIDI.Player);
  });

  key('shift+=', function(e) {
    var selected = Gradus.getSelected();
    if (selected) {
      selected.change({
        accidentals: selected.isSharp() ? '' : '^'
      });
      Gradus.replace(selected, selected);
    }
  });

  $('#controls input[name=bpm]').change(function(e) {
    var val = $(this).val();
    if (val.match(/^\d+$/) && parseInt(val) > 0) {
      Gradus.score.setTempo('1/4='+val);
      localStorage.setItem('tempo', val);
    }
  }).val(localStorage.getItem('tempo') || '120').trigger('change');
});



(function() {
  var pitchFromEvent = function(part, measure, e) {
    var y = e.offsetY || (e.clientY - $('#score').offset().top);
    var off = Math.floor(2*(y-measure.renderYOffset)/Score.Staff.LINE_HEIGHT);
    return part.offsetToPitch(off);
  };

  // Insert a note when the staff is clicked, and begin dragging
  Gradus.keyBindings['measure.mousedown'] = function(e) {
    var selected, target = e.scoreTarget;
    if (target.type == 'Measure') {
      target = target.filter('Rest').elements[0];
      if (!target)
        return;
    }

    if (!target.hyperGradus && target.type != 'Note' && target.type != 'Rest')
      return;

    Gradus.startDragging();

    if (target.hyperGradus) {
      selected = target.clone();
      Gradus.replace(target.chord, selected);
    } else {
      selected = target.change({
        type: 'Note',
        pitch: target.pitch || pitchFromEvent(this.part, this, e),
        clone: true
      });
      Gradus.replace(target, selected);
    }

    Gradus.setSelected(selected);
    e.preventDefault();
  };

  // Move selected note up/down the staff while dragging
  Gradus.keyBindings['measure.mousemove'] = function(e) {
    if (!Gradus.isDragging())
      return false;

    var selected = Gradus.getSelected();
    if (selected.measure != this)
      return;

    var pitch = pitchFromEvent(this.part, this, e);
    if (selected.pitch == pitch)
      return;

    selected.change({ pitch: pitch });
    Gradus.replace(selected, selected);
  };

  // Stop dragging when click is released
  Gradus.keyBindings['score.mouseup'] = function(e) {
    Gradus.stopDragging();
    e.preventDefault();
  };

})();
