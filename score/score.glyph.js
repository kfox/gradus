Glyph = {
  Note: {
    render: function(svg, type, opts) {
      var glyph = svg.group();
      var note = glyph.group();
      glyph.note = note;

      var dx = 0;
      if (opts.sharp || opts.flat || opts.natural) {
        if (opts.sharp)
          glyph.path(Glyph.glyphs['accidentals.sharp'].d);
        else if (opts.flat)
          glyph.path(Glyph.glyphs['accidentals.flat'].d);
        else if (opts.natural)
          glyph.path(Glyph.glyphs['accidentals.natural'].d);
        note.x(10);
        dx = -10;
      }

      var head, flags = null;
      switch(type) {
      case 'whole':
      case 'half':
      case 'quarter':
        head = Glyph.glyphs['noteheads.'+type];
        break;
      case 'eighth':
        flags = 'flags.u8th';
      case 'sixteenth':
        flags = flags || 'flags.u16th';
        head = Glyph.glyphs['noteheads.quarter'];
        break;
      }

      glyph.head = note.path(head.d);

      if (opts.ledger !== undefined) {
        if (opts.ledger == 0)
          note.line(-3, 0, head.w+3, 0).stroke('#000');
        else if (opts.ledger == -1)
          note.line(-3, head.h/2, head.w+3, head.h/2).stroke('#000');
        else if (opts.ledger == 1)
          note.line(-3, -head.h/2, head.w+3, -head.h/2).stroke('#000');
      }

      glyph.stem = note.path([
        ['M', head.w-0.5, -0.5],
        ['l', 0, -Score.Staff.LINE_HEIGHT * 3.5]
      ]).stroke('#000');
      if (type == 'whole')
        glyph.stem.opacity(0.0);

      if (flags && !opts.noflags) {
        note.path(Glyph.glyphs[flags].d).
          move(head.w-0.5, -3.5*Score.Staff.LINE_HEIGHT);
      }

      if (opts.dot) {
        note.circle(4).move(head.w+1.5, 0);
      }

      var sup = glyph.x;
      glyph.x = function(x) {
        if (arguments.length)
          return sup.call(this, x+dx);
        else
          return sup.call(this);
      };

      return glyph;
    },

    beam: function(svg, start, end) {
      var pstart = start.avatar.stem.rbox();
      var pend = end.avatar.stem.rbox();
      var slope = (pend.y - pstart.y) / (pend.x - pstart.x);
      svg.path([
        ['M', pstart.x, pstart.y],
        ['L', pend.x, pend.y],
        ['l', 0, 4],
        ['L', pstart.x, pstart.y+4]
      ]).fill('#000');

      var beam = function(element) {
        var prev = element.findPrev('Note', {neighbor: true});
        var next = element.findNext('Note', {neighbor: true});
        var pelement = element.avatar.stem.rbox();
        var x0 = (prev && prev.type == 'Note' && prev.opts.beam) ?
            (3*pelement.x + prev.avatar.stem.rbox().x)/4
            : pelement.x;
        var x1 = (next && next.type == 'Note' && element.opts.beam) ?
            (3*pelement.x + next.avatar.stem.rbox().x)/4
            : pelement.x;
        var flags = element.flags();

        var plocal = element.avatar.stem.bbox();
        var dy = pelement.y - plocal.y;
        element.avatar.stem.plot([
          ['M', plocal.x, pstart.y+slope*(pelement.x-pstart.x)-dy],
          ['L', plocal.x, plocal.y2]
        ]);
        for (var y, i=1; i < flags; ++i) {
          y = pstart.y + slope*(x0-pstart.x);
          svg.path([
            ['M', x0, y + i*7],
            ['L', x1, y + i*7 + slope*(x1-x0)],
            ['l', 0, 4],
            ['L', x0, y + i*7 + 4],
          ]).fill('#000');
        }
      };

      var curr = start;
      while (curr) {
        beam(curr);
        curr = curr.beamNext();
      }
    }
  },
  Rest: {
    render: function(svg, type, opts) {
      var rest = 'rests.'+type;
      switch(type) {
      case 'eighth':
        rest = 'rests.8th';
        break;
      case 'sixteenth:':
        rest = 'rests.16th';
        break;
      }
      return svg.path(Glyph.glyphs[rest].d);
    }
  }
};
