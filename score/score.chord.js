
Score.Chord = function() {
  this.notes = [];
};

Score.Chord.prototype = new Score.Tickable();
Score.Chord.prototype.type = 'Chord';

Score.Chord.prototype.push = function(note) {
  note.measure = this.measure;
  note.chord = this;
  this.notes.push(note);
};

Score.Chord.prototype.ticks = function() {
  return this.notes[0].ticks();
};

Score.Chord.prototype.render = function(svg, x, y) {
  this.avatar = svg.group();

  var seconds = {};
  var notes = this.notes.slice(0);
  notes.sort(function(n1, n2) { return n1.ord(true) - n2.ord(true); });
  for (var i=1; i < notes.length; ++i)
    if (notes[i].ord(true) - notes[i-1].ord(true) <= 2)
      seconds[notes[i].pitch] = seconds[notes[i-1].pitch] = true;

  var toggle = false;
  var accidentals = [];
  for (var right, i = notes.length-1; i >= 0; --i) {
    toggle = seconds[notes[i].pitch] ? !toggle : toggle;
    notes[i].render(this.avatar, x, y, {
      right: toggle,
      accidentals: accidentals
    });
  }
};

Score.Chord.prototype.toABC = function() {
  var abc = '[';
  for (var i=0; i < this.notes.length; ++i)
    abc += this.notes[i].toABC();
  abc += ']';
  return abc;
};
