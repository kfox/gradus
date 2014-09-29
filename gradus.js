

Gradus = {
  Hyper: {
    On: function(score) {
      if (Gradus.Hyper.Engaged)
        return;
      Gradus.Hyper.Engaged = true;

      var counterpoint = score.parts[0];
      var futures = Gradus.FirstSpecies.elaborate(score);

      counterpoint.findAll('Rest').forEach(function(rest, irest) {
        var pitches = {};
        var bass = counterpoint.below(rest);
        futures.forEach(function(future) {
          pitches[future[irest]] = true;
        });

        var chord = new Score.Chord();
        // TODO: measure.replace should call setMeasure()
        // setMeasure on chord should call it on its notes
        // and also find better way to set up part, score
        chord.measure = rest.measure;
        for (var pitch in pitches) {
          var note = new Score.Note({ value: rest.opts.value, pitch: pitch });
          note.part = rest.part;
          note.score = rest.score;
          chord.push(note);
        }
        rest.measure.replace(rest, chord);
      });
    },
    Off: function(score) {
      if (!Gradus.Hyper.Engaged)
        return;
      Gradus.Hyper.Engaged = false;

      var counterpoint = score.parts[0];

      counterpoint.findAll('Chord').forEach(function(chord) {
        var rest = new Score.Rest({ value: chord.notes[0].opts.value });
        rest.measure = chord.measure;
        rest.score = chord.notes[0].score;
        rest.part = chord.notes[0].part;
        chord.measure.replace(chord, rest);
      });
    }
  }
};

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
        this.opts.pitch = this.opts.pitch || 'A';
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

  $('#controls input[name=hyper]').change(function(e) {
    if ($(this).val() == 'on')
      Gradus.Hyper.On(score);
    else
      Gradus.Hyper.Off(score);
  });

  score0 = score;
});
