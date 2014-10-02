
var input = process.argv[2];
if (!input) {
  console.error("Usage: node solve.1st.js filename");
  process.exit(1);
}

var fs = require('fs');
var abc = fs.readFileSync(input).toString();

var score = Score.parseABC(abc);
var futures = Gradus.FirstSpecies.elaborate(score);

console.log("cf = CantusFirmus.first")
futures.forEach(function(future) {
  futures = futures.map(function(x) {
    if (x.length == 2)
      return x + '4'
    else
      return x + ' 4';
  });
  console.log('cf.counterpoints.create(:abc => "'+future.join('|')+'")')
});
