

Gradus = {};

$(document).ready(function() {
  var source = $('#score').text();
  var score = Score.parseABC(source);

  var dragStartY;
  var dragPitch;
  var dragging = null;
  score.render($('#score')[0], {
    showIntervals: true,
    events: {
      'staff_element.mousedown': function(e) {
        e.preventDefault();
        if (this.type == 'Note') {
          dragStartY = e.screenY;
          dragPitch = this.ord();
          dragging = this;
        } else if (this.type != 'Rest')
          return;

        dragStartY = e.screenY;
        transposeOffset = 0;

        this.opts.type = 'note';
        this.opts.pitch = 'A';
        dragging = new Score.Note(this.opts);
        dragPitch = dragging.ord();

        this.measure.replace(this, dragging);
        Gradus.FirstSpecies.notify(score, $('#messages'));
      },
      'score.mouseup': function(e) {
        e.preventDefault();
        dragging = null;
      },
      'score.mousemove': function(e) {
        e.preventDefault();
        if (!dragging)
          return;

        var x = Math.floor((e.screenY-dragStartY)/Score.Staff.LINE_HEIGHT);
        var newPitch = Score.Note.ordToPitch(dragPitch - x);
        if (newPitch != dragging.opts.pitch) {
          dragging.opts.pitch = newPitch;
          dragging.measure.replace(dragging, dragging);
          Gradus.FirstSpecies.notify(score, $('#messages'));
        }
      }
    }
  });

  MIDI.loadPlugin({
    instrument: 'acoustic_grand_piano',
    soundfontUrl: 'soundfont/',
    callback: function() {
      MIDI.Player.addListener(function(data) {
        if (data.now >= data.end)
          MIDI.Player.stop();
      });

      key('space', function(e) {
        e.preventDefault();

        if (MIDI.Player.playing)
          return MIDI.Player.stop();

        var midi_data = new Score.MidiWriter(score).writeMidi();
        MIDI.Player.loadFile(midi_data);
        MIDI.Player.start();
      });
    }
  });
  score0 = score;
//  console.log(Gradus.FirstSpecies.elaborate(score));
});
