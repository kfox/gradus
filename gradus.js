

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

      Score.Chord.prototype.toABC = function(){ return 'z4' };
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
        counterpoint.findAll(['Rest', 'Chord']).forEach(function(el, iel) {
          var chord = new Score.Chord();
          var value = (el.type == 'Rest') ? el.opts.value : el.notes[0].opts.value;
          // TODO: measure.replace should call setMeasure()
          // setMeasure on chord should call it on its notes
          // and also find better way to set up part, score
          chord.measure = el.measure;
          for (var i=0; i < chords[iel].length; ++i) {
            var note = new Score.Note({ value: value,
                                        pitch: chords[iel][i] });
            note.part = el.part;
            note.score = el.score;
            note.hyperGradus = true;
            chord.push(note);
          }
          el.measure.replace(el, chord);
          chord.avatar.opacity(0.4);
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
  var selected = null;
  var dragging = false;
  score.render($('#score')[0], {
    showIntervals: true,
    events: {
      'staff_element.mousedown': function(e) {
        e.preventDefault();

        if (this.hyperGradus || this.type == 'Note' || this.type == 'Rest') {
          dragStartY = e.screenY;
          transposeOffset = 0;
          dragging = true;
        }

        if (this.hyperGradus) {
          selected = new Score.Note({ pitch: this.opts.pitch,
                                      value: this.opts.value });
          this.chord.measure.replace(this.chord, selected);
          dragPitch = selected.ord();
          Gradus.FirstSpecies.notify(score, $('#messages'));
          Gradus.Hyper.solve(score);
          return;
        }

        if (this.type == 'Note') {
          dragPitch = this.ord();
          selected = this;
        } else if (this.type != 'Rest')
          return;

        this.opts.type = 'note';
        this.opts.pitch = this.opts.pitch || 'A';
        selected = new Score.Note(this.opts);
        dragPitch = selected.ord();

        this.measure.replace(this, selected);
        Gradus.FirstSpecies.notify(score, $('#messages'));
        Gradus.Hyper.solve(score);
      },
      'score.mouseup': function(e) {
        e.preventDefault();
        dragging = false;
      },
      'score.mousemove': function(e) {
        e.preventDefault();
        if (!dragging)
          return;

        var x = Math.floor((e.screenY-dragStartY)/Score.Staff.LINE_HEIGHT);
        var newPitch = Score.Note.ordToPitch(dragPitch - x);
        if (newPitch != selected.opts.pitch) {
          selected.opts.pitch = newPitch;
          selected.measure.replace(selected, selected);
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

  key('backspace', function(e) {
    e.preventDefault();
    if (!selected)
      return;

    var rest = new Score.Rest({ value: selected.opts.value });
    selected.measure.replace(selected, rest);
    selected = null;
    dragging = false;

    Gradus.FirstSpecies.notify(score, $('#messages'));
    Gradus.Hyper.solve(score);
  });

  score0 = score;
});
