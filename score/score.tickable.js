
Score.Tickable = function() {
};

Score.Tickable.prototype = new Score.StaffElement();

Score.Tickable.prototype.isTriplet = function() {
  var x = this.findPrev('TupletBegin', {neighbor: true});
  for (var i = 0; x && i < 3; ++i) {
    x = x.findNext(['Note', 'Rest'], {neighbor: true});
    if (x == this)
      return true;
  }
  return false;
};

Score.Tickable.prototype.ticks = function() {
  var opts = this.opts;
  var ticks = this.part.unitNoteValue();
  var prev = this.findPrev(['Note', 'Rest']);
  var dswing = prev && prev.opts.swing;
  var uswing = opts.swing;

  if (opts.value.indexOf('/') != -1) {
    var parts = (opts.value[0]=='/' ? ('1'+opts.value) : opts.value).split('/');
    ticks *= parseInt(parts[0]) / parseInt(parts[1]);
  } else {
    ticks *= parseInt(opts.value);
  }

  if (this.isTriplet()) {
    switch(ticks) {
    case Score.QUAVER:
      return Score.QUAVER_TRIPLET;
    case Score.SEMIQUAVER:
      return Score.SEMIQUAVER_TRIPLET;
    default:
      throw "Unkown triplet = "+this;
    }
  }

  if (dswing)
    ticks /= 2;
  else if (uswing)
    ticks *= 1.5;
  return ticks;
};


// For Rest and Note
Score.Tickable.prototype.toABC = function() {
  var abc = '';
  abc += this.opts.accidentals || '';
  abc += this.type == 'Rest' ? 'z' : this.opts.pitch;
  abc += (this.opts.value == '1' ? '' : this.opts.value);
  abc += ' ';
  if (this.opts.tie)
    abc += '-';
  return abc;
};

Score.Tickable.prototype.addText = function(text) {
  if (!this.avatar)
    return;

  if (this.avatar._text)
    this.avatar._text.remove();

  var y = -this.part.place(this) * Score.Staff.LINE_HEIGHT/2 - 20;
  this.avatar._text = this.avatar.plain(text);
  this.avatar._text.y(y);
};
