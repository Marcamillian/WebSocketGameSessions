console.log("something")

var something = "something"

var something = [false, false];
var somethingSmaller = [false];

var counter = (sum, value)=>{
    return (value) ? sum+1: sum;
}

var counting = something.reduce(counter, 0);
var moreCounting = somethingSmaller.reduce(counter, 0)



console.log("done")