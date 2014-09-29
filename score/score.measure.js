
Score.Measure = function(voice) {
  this.elements = [];
  this.part = voice;
};

Score.Measure.prototype = new Score.Set();

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

  var index = this.elements.indexOf(el);
  newel.measure = this;
  newel.part = el.part;
  newel.score = el.score;
  newel.prev = el.prev;
  newel.next = el.next;
  if (newel.prev)
    newel.prev.next = newel;
  if (newel.next)
    newel.next.prev = newel;
  this.elements[index] = newel;

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
    if (!this.part.score.options.showIntervals)
      continue;
    if (e.type == 'Note' && (below = this.part.below(e))) {
      if (below.type != 'Note')
        continue;
      below.addText(below.interval(e).name);
    }
  }
};
