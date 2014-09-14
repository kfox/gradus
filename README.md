## Road map

### 0.1 (basic prototype)

* Provides one hardcoded canctus firmi in treble clef (or at most a few selectable)
* Allows input of counterpoint by mouse, directly on the staves. You can input anywhere, not limited to "the next empty place"
* Allows notes to be clicked and dragged to be moved up or down on the stave (not left/right though, fuck that)
* Press play to hear the two voices in shitty midi (ideally bind spacebar to play/stop)
* After note input, writes the resultant interval above the canctus firmus stave in a small font to help you out (see the book for what this looks like)
* Big "ENGAGE HYPER-GRADUS": Calculates and shows you the next available notes in .5 opacity across the whole cf, those options update and are constrained as more notes are entered.



## Prototype constraints

Let's not make this too hard on ourselves...

* Both cantus and counterpoint in treble clef
* Let's stick with 11 bars as a set to start
* Let's provide Cantus Firmus in lower voice only for now (it can also be the upper)
* First species only, but prepare for the next species


### 1.0 and beyond

* Implement rules for species 2-5, with a toggle switch to change species mid-input. The toughest part (I predict) will be the entry and display of more complex note values (perhaps just a toggle for entry). The place I imagine it getting hairy is placing notes and the horizontal sensitivy on the staff, etc. Before we let people plunk down whole notes wherever, but what happens when they select eighth notes and click on the middle of the bar? Perhaps you can only enter notes in a bar from left to right but you can put notes in any bar.)
* Lets you "lock" input to only notes obeying the rules
* When not locked to input, shows you which rules were broken (!?)
* Lets you open a pane to specific toggle rules on/off
* Ability to input cantus firmi of varying lengths, select from several libraries, have it be in bass clef
