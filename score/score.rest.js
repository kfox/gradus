Score.Rest = function(opts) {
  this.value = opts.value || '1';
};
Score.Rest.prototype = new Score.Tickable();
Score.Rest.prototype.type = 'Rest';

Score.Rest.prototype.glyphValue = Score.Note.prototype.glyphValue;

Score.Rest.prototype.render = function(svg, x, y) {
  var rest = Glyph.Rest.render(svg, this.glyphValue());
  var box = rest.bbox();
  switch(this.glyphValue()) {
  case 'whole':
    rest.move(x + box.width/2, y + Score.Staff.LINE_HEIGHT);
    break;
  case 'half':
    rest.move(x + box.width/2, y + 2*Score.Staff.LINE_HEIGHT - box.height);
    break;
  default:
    rest.move(x + box.width/2, y + 2*Score.Staff.LINE_HEIGHT - box.height/2);
  }

  this.avatar = rest;
  this.bindListeners();
};
