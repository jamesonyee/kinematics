// We'll use math.js for matrix operations in JavaScript
// Include math.js in your Processing project

const TINYNUMBER = 0.000001;
const TEXT_SIZE = 0.08;
const SMALL_TEXT_SIZE = 0.04;
const NUM_OF_FRAMES = 1000; // change for animation rendering

let transform_list = [];    // List of all the Transformation objects
let name_to_transform = {};   // Map from name to Transformation object
let dof_list = [];    // List of all the Transformation objects with non-zero degrees of freedom
let q;  // List of DoF values (translation and hinge), N-array, same length as dof_list since we only have 1-dof Transformations
let IK_points = []; // List of current IK points created by UI 

// Butterfly colors 
let WING_FILL_1;
let WING_FILL_2;
let WING_OUTLINE;
let BODY_FILL;
let JOINT_FILL;
let JOINT_OUTLINE;

const BUTTERFLY_NAME    = "Ana the Butterfly";
const BUTTERFLY_TAGLINE = "dancing through the forest light";

let checkboxIK;
let sliderTimeline;
let buttonPlayStop;

let g_s = 250;
let x_offset_draw, y_offset_draw;

// UI variables
let selected_joint_id = -1;
let animating_joint_id = -1;
let target_id = -1;
let cursor = 0;
let timeline_origin = [-1.585, -1.225];
let timeline_width = 3.19;
let timeline_height = 0.5;
let current_frame = 500;
let playing = false;

let radioInterpolation;

let bgImg;
let bgMusic;
let forestAmbience; 
let buttonFlap;

let sliderSpeed;
let playSpeed = 1.0;  // 1.0 = normal speed
let fireflies = [];
let bees = [];

function preload() {
  bgImg = loadImage("forest_bg.jpg");
  soundFormats('mp3', 'ogg');
  bgMusic = loadSound("Butterfly.mp3");

  // ambience layer
  forestAmbience = loadSound("forest_ambience.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  x_offset_draw = windowWidth * 0.5;
  y_offset_draw = windowHeight * 0.5;
  background(255);
	YELLOW = color("yellow");
	RED    = color("red");
	GREEN  = color("green");
	BLUE   = color("blue");
	MAGENTA = color("magenta");
	ORANGE  = color("rgb(247,119,4)");
	PURPLE  = color("rgb(128,10,128)");
	BLACK = color("rgb(0,0,0)");
	GRAY = color("rgb(200,200,200)");
  
	// Pretty butterfly palette 
	WING_FILL_1  = color(255, 120, 215, 170);  // upper wings: bright pink
	WING_FILL_2  = color(255, 190,  70, 180);  // lower wings: warm gold
	WING_OUTLINE = color(255);                 // bright white
	BODY_FILL    = color(30, 18, 12);          // darker body
	JOINT_FILL   = color(252);                 // soft white
	JOINT_OUTLINE= color(15);                  // almost black

  setup_character();

  // Initialize joint positions
  let ndofs = dof_list.length;
  q = math.zeros([ndofs]);
  set_joint_positions(q);
	
	checkboxIK = createCheckbox("IK is on", true);
	checkboxIK.position(50, 50);
	checkboxIK.style('color', GRAY);
	
	// Create the radio button for selecting interpolation methods
	radioInterpolation = createRadio();
	radioInterpolation.option('Linear', 'Linear');
	radioInterpolation.option('Catmull-Rom', 'Catmull-Rom');
	radioInterpolation.option('B-Spline', 'B-Spline');
	radioInterpolation.selected('Linear'); // Default selection
	radioInterpolation.position(50, 80); // Adjust position as needed
	radioInterpolation.style('color', GRAY);
	
	buttonPlayStop = createButton('PLAY/STOP');
	buttonPlayStop.position(x_offset_draw - 30, 195);
	buttonPlayStop.mousePressed(play_animation);
	
	buttonFlap = createButton("Generate flap cycle");
	buttonFlap.position(50, 110);
	buttonFlap.mousePressed(generateFlapCycle);
	buttonFlap.addClass('flap-button');
	
	sliderTimeline = createSlider(0, NUM_OF_FRAMES - 1);
	sliderTimeline.position(x_offset_draw - 400, 170);
	sliderTimeline.size(800);
	sliderSpeed = createSlider(25, 400, 100, 25);
	sliderSpeed.position(50, 275);  
	sliderSpeed.style('width', '220px');
	sliderSpeed.addClass('flight-speed-slider');
			
	const sliderCSS = `
	  .flight-speed-slider {
	    -webkit-appearance: none;
	    appearance: none;
	    height: 10px;
	    border-radius: 999px;
	    background: transparent; 
	    box-shadow:
	      0 0 0 1px rgba(255, 120, 215, 0.85),
	      0 0 6px rgba(255, 180, 235, 0.55);
	    outline: none;
	  }
	
	  .flight-speed-slider::-webkit-slider-thumb {
	    -webkit-appearance: none;
	    appearance: none;
	    width: 18px;
	    height: 18px;
	    border-radius: 50%;
	    border: 2px solid #ffffff;
	    background: radial-gradient(
	      circle at 30% 30%,
	      #ffffff 0%,
	      #ffe6fb 35%,
	      #ff87de 70%,
	      #ffca7a 100%
	    );
	    box-shadow:
	      0 0 4px rgba(255, 190, 240, 0.9),
	      0 0 9px rgba(255, 170, 120, 0.75);
	    cursor: pointer;
	    margin-top: -5px;
	  }
	
	  .flight-speed-slider::-moz-range-track {
	    height: 10px;
	    border-radius: 999px;
	    background: transparent;
	    box-shadow:
	      0 0 0 1px rgba(255, 120, 215, 0.85),
	      0 0 6px rgba(255, 180, 235, 0.55);
	  }
	
	  .flight-speed-slider::-moz-range-thumb {
	    width: 18px;
	    height: 18px;
	    border-radius: 50%;
	    border: 2px solid #ffffff;
	    background: radial-gradient(
	      circle at 30% 30%,
	      #ffffff 0%,
	      #ffe6fb 35%,
	      #ff87de 70%,
	      #ffca7a 100%
	    );
	    box-shadow:
	      0 0 4px rgba(255, 190, 240, 0.9),
	      0 0 9px rgba(255, 170, 120, 0.75);
	    cursor: pointer;
	  }
	
	  .flap-button {
	    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	    font-size: 13px;
	    letter-spacing: 0.05em;
	    text-transform: uppercase;
	    padding: 8px 22px;
	    border-radius: 999px;
	    border: none;
	    cursor: pointer;
	
	    color: #b4009f;
	    font-weight: 600;
	    text-shadow:
	      0 1px 0 rgba(255, 255, 255, 0.9),
	      0 0 6px rgba(255, 180, 245, 0.75);
	
	    background: linear-gradient(90deg, #ff8add 0%, #ffcf73 100%);
	    box-shadow:
	      0 4px 14px rgba(0, 0, 0, 0.35),
	      0 0 0 1px rgba(255, 255, 255, 0.85);
	
	    display: inline-flex;
	    align-items: center;
	    gap: 6px;
	    transition: transform 0.12s ease-out,
	                box-shadow 0.12s ease-out,
	                filter 0.12s ease-out;
	  }
	
	  .flap-button::before {
	    content: "🦋";
	    font-size: 16px;
	  }
	
	  .flap-button:hover {
	    filter: brightness(1.06);
	    transform: translateY(-1px);
	    box-shadow:
	      0 6px 18px rgba(0, 0, 0, 0.4),
	      0 0 0 1px rgba(255, 255, 255, 0.9);
	  }
	
	  .flap-button:active {
	    transform: translateY(1px);
	    box-shadow:
	      0 3px 8px rgba(0, 0, 0, 0.35),
	      0 0 0 1px rgba(255, 255, 255, 0.8);
	  }
	`;
  createElement('style', sliderCSS);

  keyframes = new Keyframes();
  fireflies = [];
  for (let i = 0; i < 10; i++) {
    fireflies.push({
      x: random(width * 0.06, width * 0.94),
      y: random(height * 0.22, height * 0.80),
      radius: random(12, 20),          
      phase: random(TWO_PI),
      speed: random(0.008, 0.018),
      flutterSpeed: random(0.14, 0.22)
    });
  }

	bees = [
	  {
	    baseX: 260,            
	    baseY: 130,
	    radius: 52,            
	    phase: random(TWO_PI),
	    speed: random(0.004, 0.007),
	    scale: 2.2   
	  },
	  {
	    baseX: 210,
	    baseY: 190,
	    radius: 65,
	    phase: random(TWO_PI),
	    speed: random(0.004, 0.007),
	    scale: 2.0
	  },
	  {
	    baseX: width * 0.76,   
	    baseY: height * 0.72,
	    radius: 60,
	    phase: random(TWO_PI),
	    speed: random(0.004, 0.007),
	    scale: 2.3
	  }
	];
}

function draw() {
  clear();

  if (bgImg) {
    image(bgImg, 0, 0, width, height); 
  } else {
    background(255);
  }
	drawAmbientCreatures();
	drawBodyGlow();          
	updateSliderVisuals();   // keep the DOM track in sync with Ana's speed
	drawFlightSpeedLabel();
	
	// Cute name tag for Ana the Butterfly
	drawButterflyNameplate();
	drawRigHint();
	translate(x_offset_draw, y_offset_draw);
	scale(g_s);
	
	text_x = -x_offset_draw * 0.75 / g_s;
	text_y = -y_offset_draw * 0.9 / g_s;

	if(checkboxIK.checked()) {
		update_q_from_transformations();
		// TODO: STUDENT'S CODE STARTS
		const maxIters = 50;
		const learningRate = 0.1;
		
		for (let iter = 0; iter < maxIters; iter++) {
			let grad = take_IK_step();
			let totalSquaredError = 0.0;

			for (let ikp of IK_points) {
				let jointTransform = ikp.tr;
				let localPoint = ikp.local_pos;
	
				let transformWorld = jointTransform.global_transform();
				let worldPos = math.multiply(transformWorld, localPoint);
				let tx = ikp.target_pos[0];
				let ty = ikp.target_pos[1];
				let px = worldPos[0];
				let py = worldPos[1];
				let dx = px - tx;
				let dy = py - ty;
				
				let multx = dx * dx;
				let multy = dy * dy;
				totalSquaredError = totalSquaredError + (multx + multy);
			}
			
			if (totalSquaredError < TINYNUMBER) {
				break;
			}			
			let dofCount = q.length;
			for (let iter = 0; iter < dofCount; iter++) {
				let delta = learningRate * grad[iter];
				q[iter] = q[iter] - delta;
			}
			set_joint_positions(q);
		}
		// STUDENT'S CODE ENDS
	} else {
		IK_points = [];
	}

   drawCharacterWingsOverlay();
   draw_character();
	draw_annotations();
	draw_keyframe_animation();
	
	let interpolationMethod = radioInterpolation.value();

	// interpolation based on the selected method
	if (interpolationMethod === 'Linear') {
		keyframes.linear_interpolation();
	} else if (interpolationMethod === 'Catmull-Rom') {
		keyframes.catmull_rom_interpolation();
	} else if (interpolationMethod === 'B-Spline') {
		keyframes.bspline_interpolation();
	}
	
  if (playing) {
    // 0.25x ... 4.0x speed
    playSpeed = sliderSpeed.value() / 100.0;

    current_frame += playSpeed;

    if (current_frame >= NUM_OF_FRAMES) {
      current_frame = current_frame % NUM_OF_FRAMES;
    } else if (current_frame < 0) {
      current_frame += NUM_OF_FRAMES;
    }

    let frameIndex = Math.floor(current_frame);
    sliderTimeline.value(frameIndex);

    let pose = keyframes.interpolated_frames[frameIndex];
    if (pose) {
      apply_wing_symmetry_to_q(pose);
      set_joint_positions(pose);
    }
  }

}

function setup_character() {
  transform_list = [];
  name_to_transform = {};
  dof_list = [];

  let base = new Translation("base_x", "x")
    .add(new Translation("base_y", "y"))
    .add(new Hinge("base_r"));          // rotate whole butterfly

  let body = base
    .add(new Fixed("root_to_body", 0.0, 0.0))
    .add(new Hinge("body_r"));          // bend / tilt body

  // body segment
  body.add(new Fixed("body_segment", 0.0, -0.4));

  let head = body
    .add(new Fixed("body_to_head", 0.0, -0.55))
    .add(new Fixed("head", 0.0, -0.15, 1));  

  ["l", "r"].forEach((side) => {
    let sx = side === "l" ? -1.0 : 1.0;

    head
      .add(new Fixed(`${side}_ant_base_offset`, sx * 0.12, -0.10))
      .add(new Hinge(`j_${side}_ant_base`))
      .add(new Fixed(`${side}_ant_tip`, sx * 0.25, -0.20, 1));
  });

  ["l", "r"].forEach((side) => {
    let sx = side === "l" ? -1.0 : 1.0;

    body
      .add(new Fixed(`${side}_upper_wing_offset`, sx * 0.22, -0.15))
      .add(new Hinge(`j_${side}_upper_wing_root`))          // hinge 1
      .add(new Fixed(`${side}_upper_wing_mid`, sx * 0.55, -0.10))
      .add(new Hinge(`j_${side}_upper_wing_mid`))           // hinge 2
      .add(new Fixed(`${side}_upper_wing_tip`, sx * 0.55, -0.10, 1));
  });

  ["l", "r"].forEach((side) => {
    let sx = side === "l" ? -1.0 : 1.0;

    body
      .add(new Fixed(`${side}_lower_wing_offset`, sx * 0.18, 0.05))
      .add(new Hinge(`j_${side}_lower_wing_root`))          // hinge 1
      .add(new Fixed(`${side}_lower_wing_mid`, sx * 0.50, 0.18))
      .add(new Hinge(`j_${side}_lower_wing_mid`))           // hinge 2
      .add(new Fixed(`${side}_lower_wing_tip`, sx * 0.50, 0.18, 1));
  });

  body
    .add(new Fixed("tail_offset", 0.0, 0.35))
    .add(new Hinge("j_tail_base"))
    .add(new Fixed("tail_mid", 0.0, 0.30))
    .add(new Hinge("j_tail_mid"))
    .add(new Fixed("tail_tip", 0.0, 0.30, 1)); 

  transform_list.forEach((tr) => {
    name_to_transform[tr.name] = tr;
    if (tr.num_dofs() > 0) {
      dof_list.push(tr);
    }
  });

  transform_list.forEach((tr) => {
    tr.dependent_dofs = tr.parent ? new Set(tr.parent.dependent_dofs) : new Set();
    if (tr.num_dofs() > 0) {
      tr.dependent_dofs.add(tr);
    }
  });
}

function draw_character() {
  if (current_frame != sliderTimeline.value()) {
    q = keyframes.interpolated_frames[sliderTimeline.value()];

    if (q) {
      apply_wing_symmetry_to_q(q);   
      set_joint_positions(q);
      current_frame = sliderTimeline.value();
    }
  }

  transform_list.forEach((tr) => {
    tr.draw();
  });
}

function draw_annotations() {
  for (let i = 0; i < dof_list.length; i++) {
    let j = dof_list[i];

    if (!(j instanceof Hinge)) continue;
    let pos = j.global_position();
    push();
    stroke(JOINT_OUTLINE);
    strokeWeight(0.035);
    fill(JOINT_FILL);
    circle(pos[0], pos[1], 0.09);
    pop();
  }

  if (selected_joint_id >= 0) {
    let pos = dof_list[selected_joint_id].global_position();
    push();
    stroke(GREEN);
    strokeWeight(0.02);
    noFill();
    circle(pos[0], pos[1], 0.12);
    pop();
  }

  IK_points.forEach((p) => {
    p.draw_target();
  });
  if (animating_joint_id >= 0) {
    let pos = dof_list[animating_joint_id].global_position();
    push();
    stroke(ORANGE);
    strokeWeight(0.02);
    noFill();
    circle(pos[0], pos[1], 0.14);
    pop();
  }
}

function draw_keyframe_animation() {
	push();
	stroke(GRAY);
	strokeWeight(0.01);
	fill(GRAY);
	rect(timeline_origin[0], timeline_origin[1] - 0.5 * timeline_height, timeline_width, timeline_height);
	stroke(BLACK);
	fill(BLACK);
	strokeWeight(0.0001);
	textSize(TEXT_SIZE);
	let value = 0;
	if (animating_joint_id >= 0) {
		value = keyframes.interpolated_frames[sliderTimeline.value()][animating_joint_id];
	}
	text("(" + sliderTimeline.value() + ", " + value.toFixed(3) + ")", text_x + 2.1, text_y);
	pop();

	keyframes.draw_trajectory();
}

function keyPressed() {
	if (animating_joint_id >= 0) {
		let curr_value = dof_list[animating_joint_id].get_dof();
	  if (keyCode === 187) {
			curr_value = curr_value + 0.1;
			dof_list[animating_joint_id].set_dof(curr_value);
		}
		if (keyCode === 189) {
			curr_value = curr_value - 0.1;
			dof_list[animating_joint_id].set_dof(curr_value);			
		} 
		if (dof_list[animating_joint_id].name.indexOf("base") >= 0) {
  		if (keyCode === 37) {
				curr_value = name_to_transform["base_x"].get_dof();
				curr_value = curr_value - 0.1;
				name_to_transform["base_x"].set_dof(curr_value);
			}
  		if (keyCode === 39) {
				curr_value = name_to_transform["base_x"].get_dof();
				curr_value = curr_value + 0.1;
				name_to_transform["base_x"].set_dof(curr_value);
			}
			
			if (keyCode === 38) {
				curr_value = name_to_transform["base_y"].get_dof();
				curr_value = curr_value - 0.1;
				name_to_transform["base_y"].set_dof(curr_value);
			}
			if (keyCode === 40) {
				curr_value = name_to_transform["base_y"].get_dof();
				curr_value = curr_value + 0.1;
				name_to_transform["base_y"].set_dof(curr_value);
			}
		}
	}
	if (keyCode === 75) { 
		let time = sliderTimeline.value();
		update_q_from_transformations();
		let pose = [...q]
		keyframes.add_keyframe(time, pose);
	}
	if (key === 's' || key === 'S') {
	  playing = true;
	
	  print("Saving GIF...");
	  saveGif('butterfly_animation.gif', 5);   // change number of seconds for animation
	}
}

function mousePressed() {
  let x = math.divide(mouseX - x_offset_draw, g_s);
  let y = math.divide(mouseY - y_offset_draw, g_s);	

	let new_joint_id = -1;
  max_dist = 0.05;
  for (let i = 2; i < dof_list.length; i++) { // Dof 0-2 are all on the base joint. Select 2 to have the effect of dof 1 and dof 1
    let joint_pos = dof_list[i].global_position();
    let mouse_pos = [x, y];
    let diff = math.subtract(mouse_pos, joint_pos);
    if (math.norm(diff) < max_dist) {
      new_joint_id = i;
      max_dist = math.norm(diff);
    }
  }
	max_dist = 0.05;
	target_id = -1;
	for (let i = 0; i < IK_points.length; i++) {
    let IK_target = IK_points[i].target_pos;
    let mouse_pos = [x, y];
    let diff = math.subtract(mouse_pos, IK_points[i].target_pos);
    if (math.norm(diff) < max_dist) {
      target_id = i;
      max_dist = math.norm(diff);
    }		
	}

	if (checkboxIK.checked()) {
		if (keyIsDown(16) === true) { // Shift key is pressed
			if (target_id >= 0) {
				IK_points.splice(target_id, 1);
				target_id = -1;
			} else if (new_joint_id === -1 && selected_joint_id >= 0) { // shift-click a point with selected local frame
				remove_IK_Point(selected_joint_id); // make sure only one IK point in each local frame
				IK_points.push(new Point(x, y, dof_list[selected_joint_id]));
			}
		} else {
				selected_joint_id = new_joint_id;		
		}
	} else {
		if (new_joint_id >= 0) {
			if (new_joint_id != animating_joint_id) 
				animating_joint_id = new_joint_id;
			else
				animating_joint_id = -1;
		}
	}
}

function mouseDragged() {
   	let x = math.divide(mouseX - x_offset_draw, g_s);
   	let y = math.divide(mouseY - y_offset_draw, g_s);
		if (target_id >= 0)
			IK_points[target_id].target_pos = [x, y]; 
}

function mouseReleased() {
	target_id = -1;
}

function print_math_js(math_obj, precision = 6) {
  let formatted_obj = math.format(math_obj, { precision: precision });
  print(formatted_obj);
}

function transform_between(start, end) {
  if (start == end) {
    return math.identity([3]);
  } else {
    return math.multiply(
      transform_between(start, end.parent),
      end.local_transform()
    );
  }
}

function set_joint_positions(q) {
  for (let i = 0; i < q.length; i++) {
    let q_i = q[i];
    let jnt_i = dof_list[i];
    jnt_i.set_dof(q_i);
  }
}

function remove_IK_Point(joint_id) {
	for (i = 0; i < IK_points.length; i++) {
		if(IK_points[i].tr == dof_list[joint_id]) {
			IK_points.splice(i, 1)
		}
	}
}

function update_q_from_transformations() {
  for (let i = 0; i < dof_list.length; i++) {
    let value = dof_list[i].get_dof();
    q[i] = value;
  }
}

function get_dof_index_by_name(name) {
  for (let i = 0; i < dof_list.length; i++) {
    if (dof_list[i].name === name) return i;
  }
  return -1;
}

function drawButterflyNameplate() {
  push();
  textAlign(LEFT, CENTER);
  let mainSize = 26;
  let subSize  = 16;
  textSize(mainSize);
  let mainWidth = textWidth(BUTTERFLY_NAME);
  textSize(subSize);
  let subWidth = textWidth(BUTTERFLY_TAGLINE);

  let paddingX   = 24;
  let paddingY   = 12;
  let cardWidth  = max(mainWidth, subWidth) + paddingX * 2;
	
  let cardHeight = mainSize + subSize + paddingY * 3;
  let floatX = cos(frameCount * 0.017) * 7;
  let floatY = sin(frameCount * 0.022) * 6;
  let cx = width  * 0.80 + floatX;
  let cy = height * 0.80 + floatY;
  let x = cx - cardWidth  / 2;
  let y = cy - cardHeight / 2;

  // shadow
  noStroke();
  fill(0, 0, 0, 115);
  rect(x + 10, y + 10, cardWidth, cardHeight, 30);
  fill(190, 90, 210, 120);
  rect(x - 10, y - 8, cardWidth + 20, cardHeight + 16, 34);
  fill(255, 247, 255, 250);
  rect(x, y, cardWidth, cardHeight, 26);
  let washW = cardWidth * 0.52;
  fill(255, 210, 240, 70);
  rect(x, y, washW, cardHeight, 26);

  noFill();
  stroke(255, 204, 130, 230);
  strokeWeight(2.5);
  rect(x + 2, y + 2, cardWidth - 4, cardHeight - 4, 24);
  stroke(255, 64, 190, 255);
  strokeWeight(3);
  rect(x - 1.5, y - 1.5, cardWidth + 3, cardHeight + 3, 28);
  noStroke();
  fill(82, 0, 93); // plum
  textSize(mainSize);
  let titleY = y + paddingY + mainSize * 0.55;
  text(BUTTERFLY_NAME, x + paddingX, titleY);
  let lineY = titleY + 10;
  let left = x + paddingX;
  let right = x + cardWidth - paddingX;

  stroke(248, 190, 255, 200);
  strokeWeight(1.5);
  line(left, lineY, right, lineY);

  noStroke();
  for (let i = 0; i < 9; i++) {
    let t = i / 8.0;
    let px = lerp(left, right, t);
    let py = lineY + sin(t * TWO_PI * 1.5) * 2.5;
	 let r = (i % 2 === 0) ? 4 : 2.5;

    fill(255, 222, 150, 235);
    ellipse(px, py, r, r);

    fill(255, 255, 255, 220);
    ellipse(px - r * 0.2, py - r * 0.25, r * 0.45, r * 0.45);
  }

  fill(95, 63, 130, 245);
  textSize(subSize);
  let tagY = y + cardHeight - paddingY - subSize * 0.5;
  text(BUTTERFLY_TAGLINE, x + paddingX, tagY);

  let badgeR  = cardHeight * 0.70;
  let badgeCX = x + cardWidth + badgeR * 0.10;
  let badgeCY = y + cardHeight * 0.45;

  // shadow
  noStroke();
  fill(0, 0, 0, 100);
  ellipse(badgeCX + 7, badgeCY + 7, badgeR * 1.05, badgeR * 1.05);
  fill(255, 110, 220, 255);
  ellipse(badgeCX, badgeCY, badgeR, badgeR);
  fill(255, 215, 150, 255);
  arc(badgeCX, badgeCY, badgeR * 0.9, badgeR * 0.9, PI * 0.08, PI * 1.08, CHORD);
  fill(255, 181, 242, 240);
  arc(badgeCX, badgeCY, badgeR * 0.9, badgeR * 0.9, -PI * 0.92, PI * 0.08, CHORD);

  push();
  translate(badgeCX, badgeCY);
  let flutter = sin(frameCount * 0.06) * 0.08; // tiny wing motion
  rotate(-0.25);
  noStroke();
  fill(110, 40, 90, 240);
  rect(-2, -4, 4, 14, 6);
  fill(255, 240, 255, 245);

  // left upper wing
  push();
  rotate(flutter);
  ellipse(-badgeR * 0.20, -badgeR * 0.08, badgeR * 0.24, badgeR * 0.18);
  pop();

  // left lower wing
  push();
  rotate(flutter * 0.7);
  ellipse(-badgeR * 0.18, badgeR * 0.08, badgeR * 0.20, badgeR * 0.14);
  pop();

  // right upper wing
  push();
  rotate(-flutter);
  ellipse(badgeR * 0.20, -badgeR * 0.08, badgeR * 0.24, badgeR * 0.18);
  pop();

  // right lower wing
  push();
  rotate(-flutter * 0.7);
  ellipse(badgeR * 0.18, badgeR * 0.08, badgeR * 0.20, badgeR * 0.14);
  pop();
  pop(); 

  noFill();
  stroke(255, 249, 230, 255);
  strokeWeight(3);
  ellipse(badgeCX, badgeCY, badgeR * 0.92, badgeR * 0.92);
  pop();
}


function drawFlightSpeedLabel() {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  let labelX = 160;
  let labelY = 220;           
  let cardW  = 260;
  let cardH  = 78;      // slightly taller for spacing
  let frac = 0;
  let speedFactor = 1.0;
  let norm = 0.0;

  if (sliderSpeed) {
    let raw    = sliderSpeed.value();
    let minRaw = sliderSpeed.elt.min ? Number(sliderSpeed.elt.min) : 25;  
    let maxRaw = sliderSpeed.elt.max ? Number(sliderSpeed.elt.max) : 400; 

    norm        = constrain((raw - minRaw) / (maxRaw - minRaw), 0, 1);
    frac        = norm;
    speedFactor = raw / 100.0;
  }
  let haloAlpha = map(frac, 0, 1, 18, 45);
  noStroke();
  fill(190, 80, 210, haloAlpha); 
  ellipse(labelX, labelY + 1, cardW * 1.02, cardH * 1.1);
  fill(0, 0, 0, 70);
  rect(labelX + 3, labelY + 4, cardW - 6, cardH - 4, 22);
  fill(255, 248, 255, 245);
  rect(labelX, labelY, cardW, cardH, 22);
  push();
  translate(labelX - cardW / 2, labelY - cardH / 2);
  noStroke();
  fill(255, 195, 235, 65);
  rect(0, 0, cardW * 0.55, cardH, 22);
  fill(255, 220, 170, 50);
  rect(cardW * 0.45, 0, cardW * 0.55, cardH, 22);
  pop();
  noFill();
  stroke(255, 210, 150, 215);
  strokeWeight(1.7);
  rect(labelX, labelY, cardW - 5, cardH - 5, 20);

  stroke(255, 70, 200, 245);
  strokeWeight(2.2);
  rect(labelX, labelY, cardW, cardH, 22);
  let badgeR = 22;   // was 20
  let rowY   = labelY - cardH * 0.30;
  let slowX  = labelX - cardW * 0.32;
  let fastX  = labelX + cardW * 0.32;
  noStroke();
  fill(245, 210, 255, 235);
  ellipse(slowX, rowY, badgeR * 2, badgeR * 2);
  textSize(22);
  fill(120, 60, 150);
  text("🐜", slowX, rowY + 2);

  noStroke();
  fill(245, 210, 255, 235);
  ellipse(slowX, rowY, badgeR * 2.4, badgeR * 2.4);
  fill(255, 225, 170, 240);
  ellipse(fastX, rowY, badgeR * 2.4, badgeR * 2.4);

  textSize(28);      // was 22
  fill(120, 60, 150);
  text("🐜", slowX, rowY + 1);
  fill(180, 90, 30);
  text("🐝", fastX, rowY + 1);
	
  if (speedFactor <= 0.5) {        // crown for super slow
	  textSize(18);
	  fill(255, 245, 210, 255);
	  text("👑", slowX, rowY - badgeR * 0.9);
	} else if (speedFactor >= 3.0) { // crown for wild fast
	  textSize(18);
	  fill(255, 245, 210, 255);
	  text("👑", fastX, rowY - badgeR * 0.9);
	}

  textAlign(CENTER, CENTER);
  textSize(12);

  let slowBright    = color(210, 130, 255);  
  let slowDim       = color(150, 95, 180);   
  let slowTextCol   = lerpColor(slowBright, slowDim, norm);

  fill(255, 255, 255, 220);   // tiny glow
  text("slow", slowX, rowY + 21);
  fill(slowTextCol);
  text("slow", slowX, rowY + 20);

  let fastBright    = color(255, 185, 90);   
  let fastDim       = color(215, 135, 60);  
  let fastTextCol   = lerpColor(fastDim, fastBright, norm);

  fill(255, 255, 255, 220);   // tiny glow
  text("fast", fastX, rowY + 21);
  fill(fastTextCol);
  text("fast", fastX, rowY + 20);

  let baseTitleCol = color(55, 15, 75);
  let hotTitleCol  = color(red(WING_FILL_1), green(WING_FILL_1), blue(WING_FILL_1));
  let titleCol     = lerpColor(baseTitleCol, hotTitleCol, frac * 0.4);
  let titleY = labelY - 5;
  textSize(20);
  fill(255, 255, 255, 220);
  text("Flight speed", labelX + 1, titleY + 1);
  fill(titleCol);
  text("Flight speed", labelX, titleY);
  let meterY = labelY + 12;
  let trackX1 = slowX + badgeR * 1.2;
  let trackX2 = fastX - badgeR * 1.2;
  let trackW  = trackX2 - trackX1;
  let trackH  = 6;

  noStroke();
  fill(255, 255, 255, 175);
  rect((trackX1 + trackX2)/2, meterY, trackW, trackH, 999);

  let steps = 40;
  for (let i = 0; i < steps; i++) {
    let t = i / (steps - 1);
    if (t > norm) break;

    let x = lerp(trackX1, trackX2, t);
    let c = lerpColor(WING_FILL_1, WING_FILL_2, t);
    c = color(
      min(red(c)   + 25, 255),
      min(green(c) + 15, 255),
      min(blue(c)  + 25, 255)
    );

    stroke(c);
    line(x, meterY - trackH*0.5, x, meterY + trackH*0.5);
  }

  let minRaw = sliderSpeed ? Number(sliderSpeed.elt.min || 25) : 25;
  let maxRaw = sliderSpeed ? Number(sliderSpeed.elt.max || 400) : 400;
  let defNorm = constrain((100 - minRaw)/(maxRaw-minRaw),0,1);
  let defX = lerp(trackX1, trackX2, defNorm);

  stroke(255, 245, 255, 230);
  strokeWeight(1.4);
  line(defX, meterY - trackH*1.2, defX, meterY + trackH*1.2);

  let curX = lerp(trackX1, trackX2, norm);
  noStroke();
  fill(255, 255, 255, 240);
  ellipse(curX, meterY, trackH+3, trackH+3);
  fill(lerpColor(WING_FILL_1, WING_FILL_2, norm));
  ellipse(curX, meterY, trackH-1, trackH-1);
  textSize(13);
  fill(95,63,130,235);
  let descText = nf(speedFactor,1,2) + "×  –  " + getSpeedDescriptor(speedFactor);
  let descY = labelY + cardH * 0.37;
  text(descText, labelX, descY);

  pop();
}

function drawBeeIcon(cx, cy, s, emphasis) {
  let alphaBody = lerp(90, 255, emphasis);
  let flap = sin(frameCount * 0.18) * 0.30 * emphasis;
  push();
  translate(cx, cy);
  scale(s);

  noStroke();
  fill(255, 215, 120, alphaBody);
  ellipse(0, 0, 16, 11);
  fill(135, 70, 95, alphaBody);
  rectMode(CENTER);
  rect(0, -2, 16, 3, 2);
  rect(0,  2, 16, 3, 2);
  fill(255, 245, 255, 220);
  push();
  rotate(-0.9 + flap);
  ellipse(-4.5, -6, 10, 7);
  pop();
  push();
  rotate(0.9 - flap);
  ellipse(4.5, -6, 10, 7);
  pop();
  pop();
}

function drawAntIcon(cx, cy, s, emphasis) {
  let alphaBody = lerp(60, 230, emphasis);
  let bob = sin(frameCount * 0.16 + 1.2) * 1.5 * emphasis;
  push();
  translate(cx, cy + bob);
  scale(s);
  stroke(70, 40, 100, alphaBody);
  strokeWeight(1.2);
  fill(90, 55, 130, alphaBody);
  ellipse(-4, 0, 4, 4);   // head
  ellipse(0,  1.5, 5, 4.2);
  ellipse(4,  2.0, 5.5, 4.4);
  noFill();
  stroke(90, 55, 130, alphaBody);
  bezier(-5, -1.5, -7, -4, -6, -5.5, -4.5, -6);
  bezier(-3, -1.5, -1, -4,  0, -5.5,  1.5, -6);

  pop();
}

function updateSliderVisuals() {
  if (!sliderSpeed) return;

  const v    = sliderSpeed.value();
  const minV = sliderSpeed.elt.min ? Number(sliderSpeed.elt.min) : 0;
  const maxV = sliderSpeed.elt.max ? Number(sliderSpeed.elt.max) : 100;
  const frac = constrain((v - minV) / (maxV - minV), 0, 1);
  const pct  = frac * 100;
  const cSlow  = WING_FILL_1;
  const cFast  = WING_FILL_2;
  const cMid   = lerpColor(cSlow, cFast, frac);
  const slowCSS = `rgba(${red(cSlow)},${green(cSlow)},${blue(cSlow)},0.9)`;
  const midCSS  = `rgba(${red(cMid)}, ${green(cMid)}, ${blue(cMid)}, 0.95)`;
  const restCSS = `rgba(255,255,255,0.22)`;

  sliderSpeed.elt.style.background = `
    linear-gradient(
      90deg,
      ${slowCSS} 0%,
      ${midCSS}  ${pct}%,
      ${restCSS} ${pct}%,
      ${restCSS} 100%
    )
  `;
}

function getSpeedDescriptor(f) {
  if (f < 0.6)  return "ant crawl slow";
  if (f < 1.1)  return "soft forest drift";
  if (f < 2.0)  return "smooth fly";
  if (f < 3.0)  return "excited little buzz";
  return "wild bee, chaos!";
}

function generateFlapCycle() {
  keyframes.keys = [];

  current_frame = 0;
  sliderTimeline.value(0);

  let amplitude = 0.8;   // how wide the wings flap
  let period = 80;       // frames per full flap cycle

  for (let t = 0; t < NUM_OF_FRAMES; t++) {
    let pose = [...q];
    let flap = amplitude * Math.sin((2 * Math.PI * t) / period);
    function setJoint(name, value) {
      let idx = get_dof_index_by_name(name);
      if (idx >= 0) pose[idx] = value;
    }
    setJoint("j_r_upper_wing_root", flap);
    setJoint("j_r_upper_wing_mid",  -flap * 0.5);
    setJoint("j_r_lower_wing_root", flap * 0.8);
    setJoint("j_r_lower_wing_mid",  -flap * 0.3);

    // Mirror to left side
    apply_wing_symmetry_to_q(pose);
    keyframes.add_keyframe(t, pose);
  }
  playing = true;
}

function apply_wing_symmetry_to_q(qVec) {
  if (!qVec) return;

  let pairs = [
    ["j_r_upper_wing_root", "j_l_upper_wing_root"],
    ["j_r_upper_wing_mid",  "j_l_upper_wing_mid"],
    ["j_r_lower_wing_root", "j_l_lower_wing_root"],
    ["j_r_lower_wing_mid",  "j_l_lower_wing_mid"]
  ];

  pairs.forEach(([rightName, leftName]) => {
    let ri = get_dof_index_by_name(rightName);
    let li = get_dof_index_by_name(leftName);
    if (ri >= 0 && li >= 0 && qVec[ri] !== undefined) {
      qVec[li] = -qVec[ri];  // mirror
    }
  });
}

function play_animation() {
  playing = !playing;

  if (playing) {
    if (bgMusic && !bgMusic.isPlaying()) {
      bgMusic.loop();
    }
     if (forestAmbience && !forestAmbience.isPlaying()) {
       forestAmbience.loop();
     }
  } else {
    if (bgMusic && bgMusic.isPlaying()) {
      bgMusic.pause();
    }
     if (forestAmbience && forestAmbience.isPlaying()) {
       forestAmbience.pause();
     }
  }
}

function drawAmbientCreatures() {
  push();
  noStroke();
  for (let i = 0; i < 4; i++) {
    let a = 50 - i * 10;
    fill(10, 0, 20, a);
    rect(0, 0, width, 40 + i * 18);
    rect(0, height - (40 + i * 18), width, 40 + i * 18);
    rect(0, 0, 40 + i * 18, height);
    rect(width - (40 + i * 18), 0, 40 + i * 18, height);
  }
  blendMode(ADD);
  noStroke();

  let speedNorm = 0.0;
  if (sliderSpeed) {
    let raw    = sliderSpeed.value();
    let minRaw = Number(sliderSpeed.elt.min || 25);
    let maxRaw = Number(sliderSpeed.elt.max || 400);
    speedNorm  = constrain((raw - minRaw) / (maxRaw - minRaw), 0, 1);
  }

  let fireflySpeedBoost = lerp(0.75, 1.6, speedNorm); 
  let fireflyGlowBoost  = lerp(0.8,  1.7, speedNorm);

  for (let i = 0; i < fireflies.length; i++) {
    let f = fireflies[i];

	  let wobbleX = sin(frameCount * f.speed * fireflySpeedBoost + f.phase) * 8;
	  let wobbleY = cos(frameCount * f.speed * 0.9 * fireflySpeedBoost + f.phase) * 6;
	  let pulse = (0.5 + 0.5 * sin(frameCount * f.speed * 2.0 * fireflySpeedBoost + f.phase))
                * fireflyGlowBoost;

    let fx = f.x + wobbleX;
    let fy = f.y + wobbleY;

    let rOuter = f.radius * (0.6 + 0.3 * pulse) * 0.6;
    let rInner = f.radius * 0.28 * 0.6;

    fill(215, 238, 205, 10 + 25 * pulse);
    ellipse(fx, fy, rOuter * 2.2, rOuter * 2.2);
    let haloColor = lerpColor(WING_FILL_1, WING_FILL_2, 0.4);
    fill(
      red(haloColor),
      green(haloColor),
      blue(haloColor),
      18 + 35 * pulse
    );
    ellipse(fx, fy, rOuter * 1.5, rOuter * 1.5);
    fill(250, 252, 230, 35 + 55 * pulse);
    ellipse(fx, fy, rInner * 2.0, rInner * 2.0);
    let trailSteps = 4;
    let sparkleBase = lerpColor(WING_FILL_1, color(255, 255, 255, 0), 0.4);

    for (let j = 1; j <= trailSteps; j++) {
      let t = j / (trailSteps + 1);
      let tx = fx - wobbleX * 0.22 * j;
      let ty = fy - wobbleY * 0.22 * j;
      let rTrail = rInner * (1.0 - 0.4 * t);
      fill(
        red(sparkleBase),
        green(sparkleBase),
        blue(sparkleBase),
        32 * (1.0 - t)
      );
      ellipse(tx, ty, rTrail * 1.2, rTrail * 1.2);
    }
    drawFireflyButterfly(fx, fy, f.radius, f.phase);
  }

  blendMode(BLEND);
  for (let i = 0; i < bees.length; i++) {
    let b = bees[i];
    let ang = frameCount * b.speed + b.phase;
    let bx = b.baseX + cos(ang) * b.radius;
    let by = b.baseY + sin(ang * 1.1) * (b.radius * 0.6);

    let emph = 0.6 + 0.4 * (0.5 + 0.5 * sin(ang * 1.3));
    drawBeeIcon(bx, by, b.scale, emph);
  }
  pop();
}

function drawFireflyButterfly(fx, fy, size, phase) {
  push();
  translate(fx, fy);

  let hover = sin(frameCount * 0.03 + phase) * (size * 0.09);
  let flap  = sin(frameCount * 0.22 + phase) * 0.35;
  translate(0, hover);
  let bodyLen   = size * 1.05;   
  let bodyWidth = size * 0.40;  

  // body
  noStroke();
  rectMode(CENTER);
  fill(30, 20, 42, 185);
  rect(0, 0, bodyLen, bodyWidth, bodyWidth * 0.7);

  // head
  fill(55, 35, 75, 190);
  ellipse(-bodyLen * 0.45, 0, bodyWidth * 0.8, bodyWidth * 0.8);

  let wingPink = lerpColor(WING_FILL_1, color(255, 150, 220, 120), 0.55); 
  let wingGold = lerpColor(WING_FILL_2, color(255, 200, 170, 120), 0.50);
  stroke(255, 255, 255, 130);
  strokeWeight(0.8);

  push();
  rotate(-0.14 + flap);
  fill(red(wingPink), green(wingPink), blue(wingPink), 155);
  ellipse(-bodyLen * 0.25, -bodyWidth * 1.0, size * 1.75, size * 1.25);
  pop();

  push();
  rotate(0.14 - flap);
  fill(red(wingGold), green(wingGold), blue(wingGold), 155);
  ellipse(bodyLen * 0.25, -bodyWidth * 1.0, size * 1.75, size * 1.25);
  pop();

  noStroke();
  fill(255, 200, 240, 110);
  ellipse(bodyLen * 0.38, 0, bodyWidth * 1.05, bodyWidth * 1.05);
  fill(255, 235, 250, 140);
  ellipse(bodyLen * 0.38, 0, bodyWidth * 0.55, bodyWidth * 0.55);
  pop();
}

function drawCharacterWingsOverlay() {
  let bodyAnchor = name_to_transform["body_segment"];  
  if (!bodyAnchor) {
    return; 
  }
  let bodyPos = bodyAnchor.global_position(); // [x, y]
  let baseRot = 0;
  let bodyRot = 0;
  if (name_to_transform["base_r"]) {
    baseRot = name_to_transform["base_r"].get_dof();
  }
  if (name_to_transform["body_r"]) {
    bodyRot = name_to_transform["body_r"].get_dof();
  }
  let totalRot = baseRot + bodyRot;

  push();
  noStroke();
  translate(bodyPos[0], bodyPos[1]);
  rotate(totalRot);
  let speedNorm = 0.0;
  if (sliderSpeed) {
    let raw    = sliderSpeed.value();
    let minRaw = Number(sliderSpeed.elt.min || 25);
    let maxRaw = Number(sliderSpeed.elt.max || 400);
    speedNorm  = constrain((raw - minRaw) / (maxRaw - minRaw), 0, 1);
  }

  let t     = frameCount * 0.03;
  let puff  = 0.04 * sin(t);
  let alphaUpper = lerp(40, 75, speedNorm);
  let alphaLower = lerp(32, 65, speedNorm);
  let cUpper = color(
    red(WING_FILL_1),
    green(WING_FILL_1),
    blue(WING_FILL_1),
    alphaUpper
  );
  let cLower = color(
    red(WING_FILL_2),
    green(WING_FILL_2),
    blue(WING_FILL_2),
    alphaLower
  );

  fill(cUpper);
  ellipse(-0.80, -0.08 + puff, 1.35, 0.95); // left upper
  ellipse( 0.80, -0.08 + puff, 1.35, 0.95); // right upper

  // Lower wings
  fill(cLower);
  ellipse(-0.70, 0.18 - puff * 0.7, 1.20, 0.82); // left lower
  ellipse( 0.70, 0.18 - puff * 0.7, 1.20, 0.82); // right lower
  let spotColor = color(
    red(WING_FILL_1),
    green(WING_FILL_1),
    blue(WING_FILL_1),
    45
  );
  noStroke();
  fill(spotColor);
  let spots = [
    [-0.48, -0.05, 0.10, 0.07],
    [-0.32,  0.06, 0.08, 0.06],
    [ 0.35, -0.03, 0.09, 0.07],
    [ 0.52,  0.08, 0.08, 0.06]
  ];
  for (let s of spots) {
    ellipse(s[0], s[1], s[2], s[3]);
  }
  pop();
}

function drawBodyGlow() {
  push();
  let cx = x_offset_draw;
  let cy = y_offset_draw + 40;
  let speedNorm = 0.0;
  if (sliderSpeed) {
    let raw    = sliderSpeed.value();
    let minRaw = Number(sliderSpeed.elt.min || 25);
    let maxRaw = Number(sliderSpeed.elt.max || 400);
    speedNorm  = constrain((raw - minRaw) / (maxRaw - minRaw), 0, 1);
  }

  let t    = frameCount * 0.03;
  let base = 110;
  let r    = base + 10 * sin(t);
  let alpha = lerp(25, 70, speedNorm);
  noStroke();
  fill(red(WING_FILL_1), green(WING_FILL_1), blue(WING_FILL_1), alpha);
  ellipse(cx, cy, r * 2, r * 1.2);
  pop();
}

function drawRigHint() {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  const msg = "Tip: drag the white joints to pose Ana  •  Shift+click a joint to add / remove IK targets";
  textSize(11);
  const cx = width / 2;
  const cy = height - 24;   

  const paddingX = 32;      // horizontal padding
  const paddingY = 8;       // vertical padding
  const w = textWidth(msg) + paddingX;
  const h = 18 + paddingY;
  noStroke();
  fill(0, 0, 0, 120);
  rect(cx + 2, cy + 2, w, h, 999);
  fill(40, 0, 40, 150);
  rect(cx, cy, w, h, 999);
  noFill();
  stroke(255, 160, 240, 220);
  strokeWeight(1.5);
  rect(cx, cy, w - 2, h - 2, 999);

  noStroke();
  fill(255, 245, 255, 235);
  text(msg, cx, cy + 1);
  pop();
}
