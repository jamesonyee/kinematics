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

// Butterfly style colors 
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
  
	// Pretty butterfly palette (slightly richer)
	WING_FILL_1  = color(255, 120, 215, 170);  // upper wings: brighter pink
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
	
  buttonFlap = createButton("GENERATE FLAP CYCLE"); 
  buttonFlap.position(50, 110);                      
  buttonFlap.mousePressed(generateFlapCycle);        
	
	sliderTimeline = createSlider(0, NUM_OF_FRAMES - 1);
  sliderTimeline.position(x_offset_draw - 400, 170);
  sliderTimeline.size(800);

  sliderSpeed = createSlider(25, 400, 100, 25);
  sliderSpeed.position(50, 220);   
  sliderSpeed.style('width', '220px');
  sliderSpeed.addClass('flight-speed-slider');

  const sliderCSS = `
    .flight-speed-slider {
      -webkit-appearance: none;
      appearance: none;
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.6);
      box-shadow:
        0 0 0 2px rgba(40, 20, 10, 0.45),
        0 0 10px rgba(255, 200, 140, 0.4);
      outline: none;
    }

    .flight-speed-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      background: radial-gradient(
        circle at 30% 30%,
        #ffffff 0%,
        #ffe3f6 45%,
        #ffb78a 80%
      );
      box-shadow:
        0 0 6px rgba(255, 220, 150, 0.95),
        0 0 14px rgba(255, 180, 120, 0.8);
      cursor: pointer;
      margin-top: -6px; /* centers the thumb on the track */
    }

    .flight-speed-slider::-moz-range-track {
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.6);
      box-shadow:
        0 0 0 2px rgba(40, 20, 10, 0.45),
        0 0 10px rgba(255, 200, 140, 0.4);
    }

    .flight-speed-slider::-moz-range-thumb {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      background: radial-gradient(
        circle at 30% 30%,
        #ffffff 0%,
        #ffe3f6 45%,
        #ffb78a 80%
      );
      box-shadow:
        0 0 6px rgba(255, 220, 150, 0.95),
        0 0 14px rgba(255, 180, 120, 0.8);
      cursor: pointer;
    }
  `;
  createElement('style', sliderCSS);

	keyframes = new Keyframes();
}

function draw() {
  clear();

  if (bgImg) {
    image(bgImg, 0, 0, width, height); 
  } else {
    background(255);
  }

  drawFlightSpeedLabel();
  // Cute name tag for Ana the Butterfly
  drawButterflyNameplate();
	
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

  // Central body segment
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
	  if (selected_joint_id >= 0) {
			let pos = dof_list[selected_joint_id].global_position();
	    push();
			stroke(GREEN);
		  strokeWeight(0.01);
			fill(GREEN);
    	circle(pos[0], pos[1], 0.05);

    	pop();
  	}
			IK_points.forEach((p) => {
				p.draw();
				p.draw_target();
			});
	
		if (animating_joint_id >= 0) {
			let pos = dof_list[animating_joint_id].global_position();
			push();
			stroke(ORANGE);
		  strokeWeight(0.01);
			noFill();
    	circle(pos[0], pos[1], 0.1);
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
	  saveGif('butterfly_animation.gif', 3);   // change number of seconds for animation
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

function generateFlapCycle() {
  // Clear existing keyframes
  keyframes.keys = [];

  // Start from frame 0
  current_frame = 0;
  sliderTimeline.value(0);

  let amplitude = 0.8;   // how wide the wings flap
  let period = 80;       // frames per full flap cycle

  for (let t = 0; t < NUM_OF_FRAMES; t++) {
    // Start from the current q as a base pose
    let pose = [...q];

    let flap = amplitude * Math.sin((2 * Math.PI * t) / period);

    function setJoint(name, value) {
      let idx = get_dof_index_by_name(name);
      if (idx >= 0) pose[idx] = value;
    }

    // Right wing = driver
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

function drawButterflyNameplate() {
  push();

  textAlign(LEFT, CENTER);

  // Font sizes
  let mainSize = 20;
  let subSize  = 13;

  textSize(mainSize);
  let mainWidth = textWidth(BUTTERFLY_NAME);

  textSize(subSize);
  let subWidth  = textWidth(BUTTERFLY_TAGLINE);

  let paddingX = 16;
  let paddingY = 8;

  let cardWidth  = max(mainWidth, subWidth) + paddingX * 2;
  let cardHeight = mainSize + subSize + paddingY * 3;

  // bottom right ish but away from sliders
  let cx = width * 0.78;
  let cy = height * 0.82;

  let x = cx - cardWidth  / 2;
  let y = cy - cardHeight / 2;

  noStroke();
  fill(0, 0, 0, 80);
  rect(x + 3, y + 4, cardWidth, cardHeight, 18);

  fill(255, 255, 255, 230);
  rect(x, y, cardWidth, cardHeight, 18);

  noFill();
  stroke(40, 25, 10, 200);
  strokeWeight(1.5);
  rect(x, y, cardWidth, cardHeight, 18);

  // Text
  noStroke();
  fill(40, 25, 10);          
  textSize(mainSize);
  text(BUTTERFLY_NAME, x + paddingX, y + paddingY + mainSize * 0.4);

  fill(90, 60, 40, 220);     
  textSize(subSize);
  text(
    BUTTERFLY_TAGLINE,
    x + paddingX,
    y + paddingY + mainSize + subSize * 1.2
  );

  pop();
}

function drawFlightSpeedLabel() {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);

  let labelX = 150;
  let labelY = 205;
  let cardW  = 170;
  let cardH  = 38;

  noStroke();
  fill(0, 0, 0, 90);
  rect(labelX + 3, labelY + 4, cardW + 6, cardH + 6, 20);

  fill(255, 255, 255, 235);
  rect(labelX, labelY, cardW, cardH, 20);

  let frac = 0;
  if (sliderSpeed) {
    let minV = sliderSpeed.elt.min ? Number(sliderSpeed.elt.min) : 0;
    let maxV = sliderSpeed.elt.max ? Number(sliderSpeed.elt.max) : 100;
    frac = constrain((sliderSpeed.value() - minV) / (maxV - minV), 0, 1);
  }

  let stripeY = labelY - cardH * 0.32;
  let stripeW = cardW * 0.78;
  let stripeH = 6;

  fill(255, 255, 255, 90);               // pale track
  rect(labelX, stripeY, stripeW, stripeH, 4);

  let fillW = stripeW * frac;

  if (fillW > 0.001) {
    let leftX = labelX - stripeW / 2;

    let leftW = min(fillW, fillW / 2);
    fill(red(WING_FILL_1), green(WING_FILL_1), blue(WING_FILL_1), 220);
    rect(leftX + leftW / 2, stripeY, leftW, stripeH, 4);

    let rightW = fillW - leftW;
    if (rightW > 0) {
      fill(red(WING_FILL_2), green(WING_FILL_2), blue(WING_FILL_2), 230);
      rect(leftX + leftW + rightW / 2, stripeY, rightW, stripeH, 4);
    }
  }

  fill(40, 25, 10);
  textSize(14);
  text("Flight speed", labelX, labelY - 2);

  fill(90, 60, 40, 220);
  textSize(10);
  text("how fast Ana flaps", labelX, labelY + 10);

  pop();
}
