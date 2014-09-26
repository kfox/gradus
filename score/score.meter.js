
Score.SEMIBREVE = 32 * (16 * 3) * (16 * 5);
Score.MINIM = Score.SEMIBREVE / 2;
Score.CROCHET = Score.SEMIBREVE / 4;
Score.QUAVER = Score.SEMIBREVE / 8;
Score.QUAVER_TRIPLET = (2 * Score.SEMIBREVE / 8) / 3;
Score.SEMIQUAVER = Score.SEMIBREVE / 16;
Score.SEMIQUAVER_TRIPLET = (2 * Score.SEMIBREVE / 16) / 3;

Score.Meter = function(beatsPerMeasure, beatValue) {
    this.beatsPerMeasure = parseInt(beatsPerMeasure);
    this.beatValue = parseInt(beatValue);
    switch(parseInt(beatValue)) {
    case 1:
        this.beatValueInTicks = Score.SEMIBREVE;
        break;
    case 2:
        this.beatValueInTicks = Score.MINIM;
        break;
    case 4:
        this.beatValueInTicks = Score.CROCHET;
        break;
    case 8:
        this.beatValueInTicks = Score.QUAVER;
        break;
    case 16:
        this.beatValueInTicks = Score.SEMIQUAVER;
        break;
    default:
        throw "Couldn't calulate ticks for beat value = "+beatValue;
    }
    if (this.beatsPerMeasure < 2 || this.beatsPerMeasure > 9)
        throw "Invalid beats per measure = "+beatsPerMeasure;
    this.ticksPerMeasure = this.beatsPerMeasure * this.beatValueInTicks;
};

Score.Meter.prototype = new Score.StaffElement();
Score.Meter.prototype.type = 'Meter';

Score.Meter.prototype.render = function(svg, xoffset, yoffset) {
    var top, bottom;
    top = Glyph.glyphs[this.beatsPerMeasure];
    bottom = Glyph.glyphs[this.beatValue];
    svg.path(top.d).move(xoffset, yoffset+1);
    svg.path(bottom.d).move(xoffset, yoffset + 2 * Score.Staff.LINE_HEIGHT);
    return xoffset + top.w + 15;
};
