

Gradus = {
  Hyper: {
    solve: function(score) {
      if (this.worker)
        this.worker.terminate();

      var self = this;
      this.worker = new Worker('rules/worker.js');
      this.worker.onmessage = function(message) {
        self.postSolution(message.data);
        $('#controls .status').removeClass('busy').addClass('done');
      };
      this.worker.postMessage(score.toABC());
      $('#controls .status').removeClass('done').addClass('busy');
    },

    onSolutionReady: function(callback) {
      this._onSolutionReady = callback;
      if (this.solvedChords && callback)
        callback.call(this, this.solvedChords);
    },

    postSolution: function(chords) {
      this.solvedChords = chords;
      if (this._onSolutionReady)
        this._onSolutionReady.call(this, chords);
    },

    On: function(score) {
      if (Gradus.Hyper.Engaged)
        return;
      Gradus.Hyper.Engaged = true;

      this.onSolutionReady(function(chords) {
        if (chords[0].length == 0) // failed to find a solution
          return;

        var counterpoint = score.parts[0];
        counterpoint.findAll('Rest').forEach(function(rest, irest) {
          var chord = new Score.Chord();
          // TODO: measure.replace should call setMeasure()
          // setMeasure on chord should call it on its notes
          // and also find better way to set up part, score
          chord.measure = rest.measure;
          for (var i=0; i < chords[irest].length; ++i) {
            var note = new Score.Note({ value: rest.opts.value,
                                        pitch: chords[irest][i] });
            note.part = rest.part;
            note.score = rest.score;
            chord.push(note);
          }
          rest.measure.replace(rest, chord);
        });
      });
    },
    Off: function(score) {
      if (!Gradus.Hyper.Engaged)
        return;
      Gradus.Hyper.Engaged = false;

      this.onSolutionReady(null);

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
  Gradus.Hyper.solve(score);

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
        Gradus.Hyper.solve(score);
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
          Gradus.Hyper.solve(score);
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

  key('tab', function(e) {
    e.preventDefault();
    var controls = $('#controls input[name=hyper]');
    var state = controls.filter(':checked').val();
    state = controls.filter('[value='+(state == 'on' ? 'off' : 'on')+']').
      prop('checked', true).val();

    if (state == 'on')
      Gradus.Hyper.On(score);
    else
      Gradus.Hyper.Off(score);
  });

  score0 = score;
});
