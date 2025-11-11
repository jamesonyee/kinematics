// We'll use math.js for matrix operations in JavaScript
// Include math.js in your Processing project

const TINYNUMBER = 0.000001;
const TEXT_SIZE = 0.08;
const SMALL_TEXT_SIZE = 0.04;
const NUM_OF_FRAMES = 1000;

let transform_list = [];    // List of all the Transformation objects
let name_to_transform = {};   // Map from name to Transformation object
let dof_list = [];    // List of all the Transformation objects with non-zero degrees of freedom
let q;  // List of DoF values (translation and hinge), N-array, same length as dof_list since we only have 1-dof Transformations
let IK_points = []; // List of current IK points created by UI 

let checkboxIK;
let sliderTimeline;
let buttonPlayStop;

// visualization constants
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
	
  setup_character();

  // Initialize joint positions
  let ndofs = dof_list.length;
  q = math.zeros([ndofs]);
  set_joint_positions(q);
	
	checkboxIK = createCheckbox("IK is on", true);
	checkboxIK.position(50, 50);
	checkboxIK.style('color', BLACK);
	
	// Create the radio button for selecting interpolation methods
  radioInterpolation = createRadio();
  radioInterpolation.option('Linear', 'Linear');
  radioInterpolation.option('Catmull-Rom', 'Catmull-Rom');
  radioInterpolation.option('B-Spline', 'B-Spline');
  radioInterpolation.selected('Linear'); // Default selection
  radioInterpolation.position(50, 80); // Adjust position as needed
  radioInterpolation.style('color', BLACK);
	
	buttonPlayStop = createButton('PLAY/STOP');
  buttonPlayStop.position(x_offset_draw - 30, 195);
	buttonPlayStop.mousePressed(play_animation);
	
	sliderTimeline = createSlider(0, NUM_OF_FRAMES - 1);
  sliderTimeline.position(x_offset_draw - 400, 170);
  sliderTimeline.size(800);
	keyframes = new Keyframes();
	
	// noLoop();

}

function draw() {
  clear();
  translate(x_offset_draw, y_offset_draw);
  scale(g_s);
  background(255);

  text_x = -x_offset_draw * 0.75 / g_s;
  text_y = -y_offset_draw * 0.9 / g_s;

  push();
	stroke(BLACK);
	fill(BLACK);
	strokeWeight(0.0001);
	textSize(SMALL_TEXT_SIZE);

	let text_height = text_y + 2.2;
	text("Click on a joint to select the local frame of IK point you wish to create", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Shift-click the desired location for the IK point", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Drag the circle to change the target of IK point", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Try to create another IK point in a different local frame", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Shift-click on the circle to remove a created IK point", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Use the checkbox to toggle between IK/FK", text_x - 0.7, text_height);
	text_height += 0.08;
	text("In FK mode, select a joint and adjust joint angle with +/-", text_x - 0.7, text_height);
	text_height += 0.08;
	text("If root is selected, can use arrow keys to translate", text_x - 0.7, text_height);
	text_height += 0.08;	
	text("Drag the slider to the time you wish to create a keyframe", text_x - 0.7, text_height);
	text_height += 0.08;
	text("When the pose is ready, press 'k' to create a keyframe", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Create multiple keyframes to make an animation", text_x - 0.7, text_height);
	text_height += 0.08;
	text("Try different ways of interpolation using the radio buttons", text_x - 0.7, text_height);
	

	//text(`${key} : ${keyCode}`, text_x, text_y+ 0.3);
  pop();
	
	
	
	if(checkboxIK.checked()) {
		update_q_from_transformations();
		// TODO: STUDENT'S CODE STARTS
        for(let p of IK_points) {
            take_IK_step(p);
        }
		// STUDENT'S CODE ENDS
	} else {
		IK_points = [];
	}
	
  draw_character();
	draw_annotations();
	draw_keyframe_animation();
	
	// Get the selected interpolation method
	let interpolationMethod = radioInterpolation.value();

	// Perform interpolation based on the selected method
	if (interpolationMethod === 'Linear') {
		keyframes.linear_interpolation();
	} else if (interpolationMethod === 'Catmull-Rom') {
		keyframes.catmull_rom_interpolation();
	} else if (interpolationMethod === 'B-Spline') {
		keyframes.bspline_interpolation();
	}
	
	if (playing) {
		current_frame++;
		if (current_frame == NUM_OF_FRAMES)
			current_frame = 0;
		sliderTimeline.value(current_frame);
		q = keyframes.interpolated_frames[sliderTimeline.value()];
		set_joint_positions(q);
	}
  
}

function setup_character() {
  // Reset the data structure
  transform_list = [];
  name_to_transform = {};
  dof_list = [];

	// TODO: Please copy your code from P1 if you designed a new character 
  // Define the character
  let base = new Translation("base_x", "x")
    .add(new Translation("base_y", "y"))
    .add(new Hinge("base_r"));

  let torso = base.add(new Fixed(`root_to_torso`, 0, -0.25)).add(new Hinge(`spine`));
	
  torso.add(new Fixed(`torso_to_head`, 0, -0.3, 1));

  ["l", "r"].forEach((d) => {
    let sx = d === "l" ? 1.0 : -1.0;
    torso
      .add(new Fixed(`${d}_torso_to_shoulder`, sx * 0.15, -0.15))
      .add(new Hinge(`j_${d}_shoulder`))
      .add(new Fixed(`${d}_upperarm`, sx * 0.3, 0.0))
      .add(new Hinge(`j_${d}_elbow`))
      .add(new Fixed(`${d}_lowerarm`, sx * 0.3, 0.0))
			.add(new Hinge(`j_${d}_wrist`))
      .add(new Fixed(`${d}_hand`, sx * 0.15, 0.0, 1));
  });

  ["l", "r"].forEach((d) => {
    let sx = d === "l" ? 1.0 : -1.0;
    base
      .add(new Fixed(`${d}_root_to_hip`, sx * 0.1, 0.2))
      .add(new Hinge(`j_${d}_hip`))
      .add(new Fixed(`${d}_upperleg`, 0.0, 0.4))
      .add(new Hinge(`j_${d}_knee`))
      .add(new Fixed(`${d}_lowerleg`, 0.0, 0.4))
			.add(new Hinge(`j_${d}ankle`))
      .add(new Fixed(`${d}_foot`, 0.0, 0.15, 1));
  });

  // Build auxiliary data structures
  transform_list.forEach((tr) => {
    name_to_transform[tr.name] = tr;
    if (tr.num_dofs() > 0) {
      dof_list.push(tr);
    }
  });
	
	// Build dependent dofs
  transform_list.forEach((tr) => {
    tr.dependent_dofs = tr.parent ? new Set(tr.parent.dependent_dofs) : new Set();
    if (tr.num_dofs() > 0) {
      tr.dependent_dofs.add(tr);
    }
  });

}

function draw_character() {
	if(current_frame != sliderTimeline.value()){
		q = keyframes.interpolated_frames[sliderTimeline.value()];
		set_joint_positions(q);
		current_frame = sliderTimeline.value();
	}
	transform_list.forEach((tr) => {
		tr.draw()
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
	if (keyCode === 75) { // 'k' or 'K' is pressed
		let time = sliderTimeline.value();
		update_q_from_transformations();
		let pose = [...q]
		keyframes.add_keyframe(time, pose);
	
		
	} 
	// For single step debug 
	// if (key === ' ') {  // Spacebar key press will trigger draw
	// loop();           // Start the draw loop
	// noLoop();         // Immediately stop it after one execution
	// }
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
  // start and end are Transformation objects
  // return the transformation matrix from start to end
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
  // let old_q = q.slice();
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

function play_animation() {
	if (playing) {
		playing = false;
	} else { 
		playing = true;		
	}
}