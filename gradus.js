
$(document).ready(function() {
    if (window.location.search.match(/glyphs/)) {
        var x = 0;
        var y = 50;
        $(document.getElementById('score')).css('height', '1000px');
        var svg = SVG(document.getElementById('score'));
        for (var k in Glyph.glyphs) {
            svg.path(Glyph.glyphs[k].d).move(x + 30, y + 15).stroke('#000');
	    svg.text(k).move(x+30, y).font({ 'anchor': 'middle' });
            x = (x + 200) % 1000;
	    if (x == 0) y += 70;
        }
    } else {
        var source = $('#score').text();
        var score = Score.parseABC(source);
        score.render($('#score')[0]);
    }
});
