Score.Key = function() {
};

Score.Key.prototype = new Score.StaffElement();
Score.Key.prototype.type = 'Key';
Score.Key.prototype.clone = function() {
  var k = new Score.Key;
  k.sharps = this.sharps.slice(0);
  k.flats = this.flats.slice(0);
  k.names = this.names.slice(0);
  return k;
};
Score.Key.prototype.render = function(svg, xoffset, yoffset) {
  var map = {};
  switch(this.part.clef) {
  case 'treble':
    map = {
      'a': 5,
      'b': 4,
      'c': 3,
      'd': 2,
      'e': 1,
      'f': 0,
      'g': -1
    };
    break;
  case 'bass':
    map = {
      'a': 7,
      'b': 6,
      'c': 5,
      'd': 4,
      'e': 3,
      'f': 2,
      'g': 1
    };
    break;
  }

  var sharp = Glyph.glyphs['accidentals.sharp'];
  var flat = Glyph.glyphs['accidentals.flat'];
  for (var y, i=0; i < this.sharps.length; ++i, xoffset += 10) {
    y = -sharp.h/2 + map[this.sharps[i]] * Score.Staff.LINE_HEIGHT/2;
    svg.path(sharp.d).move(xoffset, y + yoffset)
  }

  for (var y, i=0; i < this.flats.length; ++i, xoffset += 10) {
    y = -3*flat.h/4 + map[this.flats[i]] * Score.Staff.LINE_HEIGHT/2;
    svg.path(flat.d).move(xoffset, y + yoffset)
  }

  return xoffset + 5;
};

Score.Key.parse = function(key) {
  for (var k in Score.Keys) {
    if (Score.Keys[k].names.indexOf(key) != -1)
      return Score.Keys[k];
  }

  throw "Unrecognized key: "+key;
};

Score.Keys = {};
Score.Keys.C_MAJOR = new Score.Key();
Score.Keys.C_MAJOR.sharps = [];
Score.Keys.C_MAJOR.flats = [];
Score.Keys.C_MAJOR.names = ["c", "C", "cmaj", "Cmaj", "CMaj"];
Score.Keys.A_MINOR = new Score.Key();
Score.Keys.A_MINOR.sharps = [];
Score.Keys.A_MINOR.flats = [];
Score.Keys.A_MINOR.names = ["am", "Am", "amin", "Amin", "AMin"];
Score.Keys.G_MAJOR = new Score.Key();
Score.Keys.G_MAJOR.sharps = ["f"];
Score.Keys.G_MAJOR.flats = [];
Score.Keys.G_MAJOR.names = ["g", "G", "gmaj", "Gmaj", "GMaj"];
Score.Keys.E_MINOR = new Score.Key();
Score.Keys.E_MINOR.sharps = ["f"];
Score.Keys.E_MINOR.flats = [];
Score.Keys.E_MINOR.names = ["em", "Em", "emin", "Emin", "EMin"];
Score.Keys.D_MAJOR = new Score.Key();
Score.Keys.D_MAJOR.sharps = ["f", "c"];
Score.Keys.D_MAJOR.flats = [];
Score.Keys.D_MAJOR.names = ["d", "D", "dmaj", "Dmaj", "DMaj"];
Score.Keys.B_MINOR = new Score.Key();
Score.Keys.B_MINOR.sharps = ["f", "c"];
Score.Keys.B_MINOR.flats = [];
Score.Keys.B_MINOR.names = ["bm", "Bm", "bmin", "Bmin", "BMin"];
Score.Keys.A_MAJOR = new Score.Key();
Score.Keys.A_MAJOR.sharps = ["f", "c", "g"];
Score.Keys.A_MAJOR.flats = [];
Score.Keys.A_MAJOR.names = ["a", "A", "amaj", "Amaj", "AMaj"];
Score.Keys.F_SHARP_MINOR = new Score.Key();
Score.Keys.F_SHARP_MINOR.sharps = ["f", "c", "g"];
Score.Keys.F_SHARP_MINOR.flats = [];
Score.Keys.F_SHARP_MINOR.names = ["f#m", "F#m", "f#min", "F#min", "F#Min"];
Score.Keys.E_MAJOR = new Score.Key();
Score.Keys.E_MAJOR.sharps = ["f", "c", "g", "d"];
Score.Keys.E_MAJOR.flats = [];
Score.Keys.E_MAJOR.names = ["e", "E", "emaj", "Emaj", "EMaj"];
Score.Keys.C_SHARP_MINOR = new Score.Key();
Score.Keys.C_SHARP_MINOR.sharps = ["f", "c", "g", "d"];
Score.Keys.C_SHARP_MINOR.flats = [];
Score.Keys.C_SHARP_MINOR.names = ["c#m", "C#m", "c#min", "C#min", "C#Min"];
Score.Keys.B_MAJOR = new Score.Key();
Score.Keys.B_MAJOR.sharps = ["f", "c", "g", "d", "a"];
Score.Keys.B_MAJOR.flats = [];
Score.Keys.B_MAJOR.names = ["b", "B", "bmaj", "Bmaj", "BMaj"];
Score.Keys.G_SHARP_MINOR = new Score.Key();
Score.Keys.G_SHARP_MINOR.sharps = ["f", "c", "g", "d", "a"];
Score.Keys.G_SHARP_MINOR.flats = [];
Score.Keys.G_SHARP_MINOR.names = ["g#m", "G#m", "g#min", "G#min", "G#Min"];
Score.Keys.F_SHARP_MAJOR = new Score.Key();
Score.Keys.F_SHARP_MAJOR.sharps = ["f", "c", "g", "d", "a", "e"];
Score.Keys.F_SHARP_MAJOR.flats = [];
Score.Keys.F_SHARP_MAJOR.names = ["f#", "F#", "f#maj", "F#maj", "F#Maj"];
Score.Keys.D_SHARP_MINOR = new Score.Key();
Score.Keys.D_SHARP_MINOR.sharps = ["f", "c", "g", "d", "a", "e"];
Score.Keys.D_SHARP_MINOR.flats = [];
Score.Keys.D_SHARP_MINOR.names = ["d#m", "D#m", "d#min", "D#min", "D#Min"];
Score.Keys.G_FLAT_MAJOR = new Score.Key();
Score.Keys.G_FLAT_MAJOR.sharps = [];
Score.Keys.G_FLAT_MAJOR.flats = ["b", "e", "a", "d", "g", "c"];
Score.Keys.G_FLAT_MAJOR.names = ["gb", "Gb", "gbmaj", "Gbmaj", "GbMaj"];
Score.Keys.E_FLAT_MINOR = new Score.Key();
Score.Keys.E_FLAT_MINOR.sharps = [];
Score.Keys.E_FLAT_MINOR.flats = ["b", "e", "a", "d", "g", "c"];
Score.Keys.E_FLAT_MINOR.names = ["ebm", "Ebm", "ebmin", "Ebmin", "EbMin"];
Score.Keys.D_FLAT_MAJOR = new Score.Key();
Score.Keys.D_FLAT_MAJOR.sharps = [];
Score.Keys.D_FLAT_MAJOR.flats = ["b", "e", "a", "d", "g"];
Score.Keys.D_FLAT_MAJOR.names = ["db", "Db", "dbmaj", "Dbmaj", "DbMaj"];
Score.Keys.B_FLAT_MINOR = new Score.Key();
Score.Keys.B_FLAT_MINOR.sharps = [];
Score.Keys.B_FLAT_MINOR.flats = ["b", "e", "a", "d", "g"];
Score.Keys.B_FLAT_MINOR.names = ["bbm", "Bbm", "bbmin", "Bbmin", "BbMin"];
Score.Keys.A_FLAT_MAJOR = new Score.Key();
Score.Keys.A_FLAT_MAJOR.sharps = [];
Score.Keys.A_FLAT_MAJOR.flats = ["b", "e", "a", "d"];
Score.Keys.A_FLAT_MAJOR.names = ["ab", "Ab", "abmaj", "Abmaj", "AbMaj"];
Score.Keys.F_MINOR = new Score.Key();
Score.Keys.F_MINOR.sharps = [];
Score.Keys.F_MINOR.flats = ["b", "e", "a", "d"];
Score.Keys.F_MINOR.names = ["fm", "Fm", "fmin", "Fmin", "FMin"];
Score.Keys.E_FLAT_MAJOR = new Score.Key();
Score.Keys.E_FLAT_MAJOR.sharps = [];
Score.Keys.E_FLAT_MAJOR.flats = ["b", "e", "a"];
Score.Keys.E_FLAT_MAJOR.names = ["eb", "Eb", "ebmaj", "Ebmaj", "EbMaj"];
Score.Keys.C_MINOR = new Score.Key();
Score.Keys.C_MINOR.sharps = [];
Score.Keys.C_MINOR.flats = ["b", "e", "a"];
Score.Keys.C_MINOR.names = ["cm", "Cm", "cmin", "Cmin", "CMin"];
Score.Keys.B_FLAT_MAJOR = new Score.Key();
Score.Keys.B_FLAT_MAJOR.sharps = [];
Score.Keys.B_FLAT_MAJOR.flats = ["b", "e"];
Score.Keys.B_FLAT_MAJOR.names = ["bb", "Bb", "bbmaj", "Bbmaj", "BbMaj"];
Score.Keys.G_MINOR = new Score.Key();
Score.Keys.G_MINOR.sharps = [];
Score.Keys.G_MINOR.flats = ["b", "e"];
Score.Keys.G_MINOR.names = ["gm", "Gm", "gmin", "Gmin", "GMin"];
Score.Keys.F_MAJOR = new Score.Key();
Score.Keys.F_MAJOR.sharps = [];
Score.Keys.F_MAJOR.flats = ["b"];
Score.Keys.F_MAJOR.names = ["f", "F", "fmaj", "Fmaj", "FMaj"];
Score.Keys.D_MINOR = new Score.Key();
Score.Keys.D_MINOR.sharps = [];
Score.Keys.D_MINOR.flats = ["b"];
Score.Keys.D_MINOR.names = ["dm", "Dm", "dmin", "Dmin", "DMin"];
