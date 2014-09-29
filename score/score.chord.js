
Score.Chord = function() {
  this.notes = [];
};

Score.Chord.prototype = new Score.Tickable();
Score.Chord.prototype.type = 'Chord';

Score.Chord.prototype.push = function(note) {
  note.measure = this.measure;
  this.notes.push(note);
};

Score.Chord.prototype.ticks = function() {
  return this.notes[0].ticks();
};

Score.Chord.prototype.render = function(svg, x, y) {
  this.avatar = svg.group();
  for (var i=0; i < this.notes.length; ++i)
    this.notes[i].render(this.avatar, x, y);
};
