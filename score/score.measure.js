
Score.Measure = function(voice) {
  this.elements = [];
  this.part = voice;
};

Score.Measure.prototype = new Score.Set();
Score.Measure.prototype.type = 'Measure';

Score.Measure.prototype.push = function(x) {
  this.elements.push(x);
  x.measure = this;
};

Score.Measure.prototype.replace = function(el, newel, rerender) {
  rerender = (rerender === undefined) ? true : rerender;

  if (rerender) {
    for (var i=0; i < this.elements.length; ++i) {
      if (this.elements[i].avatar) {
        this.elements[i].avatar.remove();
        this.elements[i].avatar = null;
      }
    }
  }

  newel.measure = this;
  newel.part = el.part;
  newel.score = el.score;
  newel.prev = el.prev;
  newel.next = el.next;
  if (newel.prev)
    newel.prev.next = newel;
  if (newel.next)
    newel.next.prev = newel;

  var index = this.elements.indexOf(el);
  if (index == -1) {
    this.filter('Chord').elements.forEach(function(chord) {
      index = chord.notes.indexOf(el);
      if (index != -1)
        chord.notes[index] = newel;
    });
  } else {
    this.elements[index] = newel;
  }

  if (rerender) {
    this.prerender(svg0, this.renderYOffset);
    this.part.score.reformatLine(this.renderLineNumber, this.renderXOffset);
  }
};

Score.Measure.prototype.renderBeams = function(svg) {
  for (var start, end, i=0; i < this.elements.length; ++i) {
    if (this.elements[i].type != 'Note')
      continue;
    if (this.elements[i].isBeamStart(true)) {
      start = this.elements[i];
      end = start.beamEnd();
      Glyph.Note.beam(svg, start, end);
    }
  }
};

Score.Measure.prototype.prerender = function(svg, yoffset) {
  this.renderYOffset = yoffset;
  for (var e, g, below, i=0; i < this.elements.length; ++i) {
    e = this.elements[i];
    e.render(svg, 0, yoffset);
    if (!this.part.score.options.showIntervals || e.type != 'Note')
      continue;

    var above, below;
    if ((below = this.part.below(e)))
      above = e;
    else if ((above = this.part.above(e)))
      below = e;

    if (above && below && above.type == 'Note' && below.type == 'Note')
      below.addText(below.interval(above).name);
  }
};

Score.Measure.prototype.render = function(svg) {
  var x = this.elements[0].avatar.rbox().x;
  var y = this.renderYOffset - Score.Staff.VERTICAL_PADDING/2;

  var w, h, right = this.elements[this.elements.length-1];
  if (right.next && right.next.avatar)
    w = right.next.avatar.rbox().x - x;
  else
    w = right.avatar.rbox().x2 - x;
  h = Score.Staff.HEIGHT + Score.Staff.VERTICAL_PADDING;

  this.avatar = svg.rect(w, h).move(x, y).opacity(0.0);
  this.avatar.back();
  this.bindListeners();
};

Score.Measure.prototype.bindListeners = function() {
  var self = this;
  this.avatar.mousemove(function(e) {
    self.trigger('mousemove', e);
  });
  this.avatar.mousedown(function(e) {
    self.trigger('mousedown', e);
  });
};

Score.Measure.prototype.trigger = function(id, event) {
  var score = this.elements[0].score;
  var scopedId = 'measure.'+id;
  event.scoreTarget = event.scoreTarget || this;
  if (score.eventListeners[scopedId])
    score.eventListeners[scopedId].call(this, event);
};
