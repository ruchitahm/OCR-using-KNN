/* The original <http://yann.lecun.com/exdb/mnist/> MNIST docs state:

       The original black and white (bilevel) images from NIST were
       size normalized to fit in a 20x20 pixel box while preserving
       their aspect ratio. The resulting images contain grey levels as
       a result of the anti-aliasing technique used by the
       normalization algorithm. the images were centered in a 28x28
       image by computing the center of mass of the pixels, and
       translating the image so as to position this point at the
       center of the 28x28 field.

    So this application draws the image on a 20x20 canvas, zoomed by a
    factor of 10 using CSS.  The drawn image is regarded as a
    black-and-white bilevel image.  The image is extracted from the
    canvas and anti-aliased using a gaussian filter.  Then the image
    is written on to a 28x28 MNIST grid with its center-of-gravity
    centered on the center of the MNIST grid.

*/

import makeKnnWsClient from "./knn-ws-client.mjs";
import canvasToMnistB64 from "./canvas-to-mnist-b64.mjs";
// import classfiy from "./knn-ws-client.mjs";


//logical size of canvas
const DRAW = { width: 20, height: 20 };

//canvas is zoomed by this factor
const ZOOM = 10;

//color used for drawing digits; this cannot be changed arbitrarily as
//the value selected from each RGBA pixel depends on it being blue.
const FG_COLOR = "blue";
let res;
class DigitImageRecognizer extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const template = document.querySelector("#recognizer-template");
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    const wsUrl = this.getAttribute("ws-url");
    // console.log("UR",wsUrl)
    this.init(wsUrl);
  }

  static get observedAttributes() {
    return ["ws-url"];
  }
  attributeChangedCallback(name, _oldValue, newValue) {
    //TODO
    // this.knnWsClient=makeKnnWsClient(newValue);
    this.init(newValue);
    // // console.log("NewURl", newur)
    // var ur = this.document.getElementById("ws-url")
    var wsur = this.getAttribute("ws-url")
    // console.log("WSURL", wsur)
    var ur = "https://zdu.binghamton.edu:2345"
    if(wsur == ur){
      // console.log("if here")
      // console.log(this.shadowRoot.getElementById("errors"))
      var list = this.shadowRoot.getElementById("errors").className += "newClass"
      // var knnlable = this.shadowRoot.querySelector("#knn-label")
      // console.log("InnerHTML",knnlable)
      // this.shadowRoot.querySelector("#recognize").onclick = this.changeColor(); 
      // if(){
        // this.shadowRoot.querySelector("#recognize").addEventListener("click", () => {
          // console.log("==>", this.shadowRoot)
        this.shadowRoot.querySelector("#recognize").addEventListener("click", () => {
        this.changeColor();
      });
    }
    // }
    else{
      // console.log("else here")
      // console.log(this.shadowRoot.getElementById("errors"))
      var ullist = this.shadowRoot.getElementById("errors")
      var remul = ullist.removeAttribute('class');
      // remul = ullist.classList.remove("newClass")
      // console.log(this.shadowRoot.getElementById("errors"))
      // console.log
    }
    // var ulclass =  this.shadowRoot.getElementById("errors")
    // if(ulclass){
    //  console.log("Inside Normal If")
    //  console.log("InnerHTML",this.shadowRoot.querySelector("#knn-label").innerHTML)
     // this.shadowRoot.querySelector("#knn-label").innerHTML=label.label;
  //  }
  }
   changeColor() {
    // console.log("Change Clicked")
    // console.log("==>",this.shadowRoot.getElementById("errors"))
    // console.log("==>",this.shadowRoot.querySelector(".newClass"))
    // console.log("==>",this.shadowRoot.querySelector("strong"))
    var aa = this.shadowRoot.getElementById("errors")
    if(aa.matches(".newClass")){
      // console.log("yes")
    // var labeltag = this.shadowRoot.querySelector("strong").style.color = "red"
    // var labval = this.shadowRoot.querySelector("#knn-label").innerHTML
    // console.log("LabVal",labval)
    // console.log("Pass",this.shadowRoot.getElementById("errors").innerHTML = ``)
    this.shadowRoot.getElementById("errors").innerHTML = ``
    // return false;
    }
    else{
      // console.log("no")
      // // var labeltag = this.shadowRoot.querySelector("strong").style.color = "black"
      var labval = this.shadowRoot.querySelector("#knn-label").innerHTML = ``
      // console.log("LabVal",labval)
      this.shadowRoot.getElementById("errors").innerHTML = `<li> Failed to Fetch </li>`
      // console.log("Fail",this.shadowRoot.getElementById("errors").innerHTML = `<li> Failed to Fetch </li>`)
    }
  }  
 
  /** Initialize canvas attributes, set up event handlers and attach a
   *  knn web services client for wsUrl to this.  Note that the
   *  environment for the event handlers will have access to this
   *  function's variable via their closures, in particular they will
   *  have access to the canvas, ctx, last and mouseDown variables.
   */

  

  init(wsUrl) {
    const shadow = this.shadowRoot; //convenient alias

    const canvas = shadow.querySelector("#img-canvas");
    canvas.width = DRAW.width;
    canvas.height = DRAW.height;
    canvas.style.width = `${ZOOM * DRAW.width}.px`;
    canvas.style.height = `${ZOOM * DRAW.height}px`;

    const ctx = (this.ctx = canvas.getContext("2d"));

    // set up ctx attributes sufficient for this project
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.strokeStyle = FG_COLOR;
    ctx.lineWidth = 1;

    // const canvas = document.getElementById('img-canvas');
    // const ctx = canvas.getContext('2d');

    // First path
    // ctx.beginPath();
    // ctx.strokeStyle = 'blue';
    // ctx.moveTo(0, 10);
    // ctx.lineTo(10, 10);
    // ctx.stroke();
    // console.log("Canvas",canvas.width, canvas.height)

    /** set up an event handler for the clear button being clicked */
    //TODO
    // this.shadowRoot.querySelector("#clear").addEventListener("click", this.resetApp(ctx));
    shadow.querySelector("#clear").addEventListener("click", () => {
      this.resetApp(ctx);
      // console.log("Button clicked.");
    });
    
    /** set up an event handler for the recognize button being clicked. */
    //TODO
    shadow.querySelector("#recognize").addEventListener("click", (e) => this.recognize(ctx));
    
    /** set up an event handler for the pen-width being changed. */
    //TODO
    let p = this.shadowRoot.getElementById("pen-width")
    function onChange(){
      var value = p.value;
      // var text = p.options[p.selectedIndex].text;
      // console.log(value, text);
      // console.log("==>",value);
      ctx.lineWidth = value;
      // console.log("Ctx:",ctx.lineWidth);
    }
    p.onchange = onChange;
    onChange();

    /** true if the mouse button is currently pressed within the canvas */
    let mouseDown = false;

    /** the last {x, y} point within the canvas where the mouse was
     *  detected with its button pressed. In logical canvas
     *  coordinates.
     */
    let last = { x: 0, y: 0 };
    let x,y = 0;
//     /** set up an event handler for the mouse button being pressed within
//      *  the canvas.
//      */
//     //TODO
canvas.onmousedown = function(e){
  var response= eventCanvasCoord(canvas,e);
  x = response.x;
  y = response.y;
  mouseDown = true;
  // console.log("MouseDown")
}


//     /** set up an event handler for the mouse button being moved within
//      *  the canvas.
//      */
//     //TODO
canvas.addEventListener('mouseup',(e)=>{
  mouseDown=false;
  // console.log("MouseUp")
  })
   
//     /** set up an event handler for the mouse button being released within
//      *  the canvas.
//      */
//     //TODO

canvas.addEventListener('mousemove',(e)=>{

  if(mouseDown){
    var response= eventCanvasCoord(canvas,e);
    draw(ctx, x,y,response.x,response.y);
    x = response.x;
    y = response.y;
    // console.log("MouseMove");
  }
});

//     /** set up an event handler for the mouse button being moved off
//      *  the canvas.
//      */
//     //TODO 

    /** Create a new KnnWsClient instance in this */
    res = new makeKnnWsClient(this.getAttribute("ws-url"))
    // console.log("RES",res)
  }
 
  /** Clear canvas specified by graphics context ctx and any
   *  previously determined label
   */
  resetApp(ctx) {
//     console.log("TODO resetApp()");
//     let element = document.getElementById('recognizer');
//     var canvas = element.shadowRoot.querySelector("#img-canvas")
//     // console.log(canvas) 
// // const canvas = shadow.querySelector("#img-canvas");
//  ctx = (this.ctx = canvas.getContext("2d"));
// console.log(ctx);
ctx.clearRect(0, 0,ctx.canvas.width, ctx.canvas.height);
this.shadowRoot.querySelector("#knn-label").innerHTML = ``
  }

  /** Label the image in the canvas specified by canvas corresponding
   *  to graphics context ctx.  Specifically, call the relevant web
   *  services to label the image.  Display the label in the result
   *  area of the app.  Display any errors encountered.
   */

  async recognize(ctx) {
//     let element = document.getElementById('recognizer');
//     var canvas = element.shadowRoot.querySelector("#img-canvas")
//  ctx = (this.ctx = canvas.getContext("2d"));
// console.log("CTX",ctx);
    // try{
        var can64 = canvasToMnistB64(ctx);
        // console.log("CAN64",can64);
        // console.log("res==>",res);
        var id=await res.classify(can64);
        // console.log("=id=>",id);
        var label=await res.getImage(id.id);
        // console.log("=label=>",label);
        this.shadowRoot.querySelector("#knn-label").innerHTML=label.label;
       
  }
// await this.kwsc.classfiy(canvasToMnistB64(ctx))

  /** given a result for which hasErrors is true, report all errors
   *  in the application's error area.
   */
  reportErrors(errResult) {
    const html = errResult.errors
      .map((e) => `<li>${e.message}</li>`)
      .join("\n");
    this.shadowRoot.querySelector("#errors").innerHTML = html;
  }
}

/** Draw a line from {x, y} point pt0 to {x, y} point pt1 in ctx */
function draw(ctx, x1, y1, x2, y2) {
  //TODO
  // console.log("here")
  // console.log(ctx)
  ctx.beginPath();
  // ctx.strokeStyle = 'black';
  // ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
  
}



/** Returns the {x, y} coordinates of event ev relative to canvas in
 *  logical canvas coordinates.
 */
function eventCanvasCoord(canvas, ev) {
  const x = (ev.pageX - canvas.offsetLeft) / ZOOM;
  const y = (ev.pageY - canvas.offsetTop) / ZOOM;
  return { x, y };
}

customElements.define("digit-image-recognizer", DigitImageRecognizer);
