

Gradus = {
  Hyper: {
    solve: function() {
      if (this.worker)
        this.worker.terminate();

      var self = this, score = Gradus.score;
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

    On: function() {
      if (Gradus.Hyper.Engaged)
        return;
      Gradus.Hyper.Engaged = true;

      var score = Gradus.score;
      this.onSolutionReady(function(chords) {
        if (!chords.length || chords[0].length == 0) // failed to find a solution
          return;

        var counterpoint = score.part('Counterpoint');
        counterpoint.findAll(['Rest', 'Chord']).forEach(function(el, iel) {
          var chord = new Score.Chord();
          var value = (el.type == 'Rest') ? el.value : el.notes[0].value;
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
    Off: function() {
      if (!Gradus.Hyper.Engaged)
        return;
      Gradus.Hyper.Engaged = false;

      var score = Gradus.score;
      this.onSolutionReady(null);

      var counterpoint = score.part('Counterpoint');
      counterpoint.findAll('Chord').forEach(function(chord) {
        var rest = new Score.Rest({ value: chord.notes[0].value });
        rest.measure = chord.measure;
        rest.score = chord.notes[0].score;
        rest.part = chord.notes[0].part;
        chord.measure.replace(chord, rest);
      });
    }
  },

  getSelected: function() {
    return this._selected;
  },
  setSelected: function(x) {
    this._selected = x;
  },
  isDragging: function() {
    return this._dragging;
  },
  startDragging: function() {
    this._dragging = true;
  },
  stopDragging: function() {
    this._dragging = false;
  },

  replace: function(e1, e2) {
    var score = this.score;
    e1.measure.replace(e1, e2);
    Gradus.FirstSpecies.notify(score, $('#messages'));
    Gradus.Hyper.solve();
  },

  load: function(source) {
    try {
      this.score = Score.parseABC(source);
    } catch (e) {
      return $('#messages').text('Error parsing ABC');
    }

    this.score.render($('#score')[0], {
      showIntervals: true,
      events: this.keyBindings
    });
    Gradus.Hyper.solve();
  },

  keyBindings: {}
};

$(document).ready(function() {
  var source = getSharedABC() || $('#library >*').text();
  Gradus.load(source);
});
