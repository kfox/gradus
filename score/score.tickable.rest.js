Score.Rest = function(opts) {
    this.opts = opts;
};
Score.Rest.prototype = new Score.Tickable();
Score.Rest.prototype.type = 'Rest';

Score.Rest.prototype.glyphValue = Score.Note.prototype.glyphValue;

Score.Rest.prototype.render = function(svg, x, y) {
    var rest = Glyph.Rest.render(svg, this.glyphValue());
    var box = rest.bbox();
    rest.move(x + box.width/2, y + 2*Score.Staff.LINE_HEIGHT - box.height/2);
    this.avatar = rest;
    this.bindListeners();
};
