
$(document).ready(function() {
    var source = $('#score').text();
    var score = Score.parseABC(source);
    score.render($('#score')[0]);

    MIDI.loadPlugin({
        instrument: 'acoustic_grand_piano',
        soundfontUrl: 'soundfont/',
        callback: function() {
            key('space', function(e) {
                e.preventDefault();

                if (MIDI.Player.playing)
                    return MIDI.Player.stop();

                var midi_data = new Score.MidiWriter(score).writeMidi();
                MIDI.Player.loadFile(midi_data);
                MIDI.Player.addListener(function(data) {
                    if (data.now >= data.end)
                        MIDI.Player.stop();
                });
                MIDI.Player.start();
            });
        }
    });
});
