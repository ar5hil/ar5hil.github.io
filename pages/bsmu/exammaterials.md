---
permalink: /bsmu/exammaterials/
title: Exam Materials
---

**Anesthesiology**		— <a href="/assets/exampdf/anesthi.pdf" download="Anesthesiology">Download</a> <p id="demo"></p> <!-- Display the countdown timer in an element -->
<script>
// Set the date we're counting down to
var countDownDate = new Date("Jun 2, 2023 08:00:00").getTime();

// Update the count down every 1 second
var x = setInterval(function() {

  // Get today's date and time
  var now = new Date().getTime();

  // Find the distance between now and the count down date
  var distance = countDownDate - now;

  // Time calculations for days, hours, minutes and seconds
  var days = Math.floor(distance / (1000 * 60 * 60 * 24));
  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Display the result in the element with id="demo"
  document.getElementById("demo").innerHTML = days + "d " + hours + "h "
  + minutes + "m " + seconds + "s ";

  // If the count down is finished, write some text
  if (distance < 0) {
    clearInterval(x);
    document.getElementById("demo").innerHTML = "Done";
  }
}, 1000);
</script>

**Internal Medcine**	— <a href="/assets/exampdf/id.pdf" download="Internal Medcine">Download</a>

**Surgical Diseases**	— <a href="/assets/exampdf/surgical.pdf" download="Surgical Diseases">Download</a>

**Obstetrics**			— <a href="/assets/exampdf/obsgyne.pdf" download="Obstetrics">Download</a>

**Neurology**			— <a href="/assets/exampdf/neuro.pdf" download="Neurology">Download</a>