class Transformation {
  constructor(name = null) {
    transform_list.push(this);
    this.name = name;
    this.parent = null;
    this.children = [];
		this.dependent_dofs = new Set();

  }

  add(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  global_transform() {
    return transform_between(null, this);
  }

  global_position() {
    return math.flatten(
      math.subset(this.global_transform(), math.index([0, 1], 2))
    );
  }
	
  local_transform() {
    throw "not implemented";
  }

  local_derivative() {
    throw "not implemented";
  }

  num_dofs() {
    throw "not implemented";
  }

  get_dof() {
    throw "not implemented";
  }

  set_dof(value = 0.0) {
    throw "not implemented";
  }
	
  toString() {
    return `${this.constructor.name}(${this.name})`;
  }
}

class Fixed extends Transformation {
  constructor(name, tx = 0.0, ty = 0.0, end_effector = 0) {
    super(name);
    this.end_effector = end_effector;
    this._value = math.identity([3]);
    this._value = math.subset(this._value, math.index([0, 1], 2), [[tx], [ty]]);
  }

  num_dofs() { return 0; }

  local_transform() { return this._value; }

  draw() {
    const isWing =
      this.name.includes("upper_wing") || this.name.includes("lower_wing");
    const isAntenna = this.name.includes("ant_");
    const isBody = !isWing && !isAntenna && this.name !== "head";

    if (this.name === "head") {
      const headPos = this.global_position();
      push();
      // head circle
      stroke(WING_OUTLINE);
      strokeWeight(0.014);
      fill(255, 245, 230, 235);
      circle(headPos[0], headPos[1], 0.22);

      // eyes
      noStroke();
      fill(40, 40, 40);
      circle(headPos[0] - 0.045, headPos[1] - 0.02, 0.04);
      circle(headPos[0] + 0.045, headPos[1] - 0.02, 0.04);

      // tiny smile
      stroke(40, 40, 40, 200);
      strokeWeight(0.01);
      noFill();
      arc(headPos[0], headPos[1] + 0.03, 0.08, 0.05, 0, PI);
      pop();
      return;
    }

    // base thickness per segment
    let segmentThickness =
      isWing    ? 0.07 :
      isAntenna ? 0.03 :
                  0.08;

    push();
    strokeWeight(0.012);

    // into parent frame
    let mat = math.flatten(
      math.transpose(
        math.subset(this.parent.global_transform(), math.index([0, 1], [0, 1, 2]))
      )
    );
    applyMatrix(mat);

    let tip = math.flatten(math.subset(this._value, math.index([0, 1], 2)));
    let length = math.norm(tip);

    if (length > TINYNUMBER) {
      // orientation
      let angle;
      if (tip[0] > 0) angle = math.asin(tip[1] / length);
      else           angle = PI - math.asin(tip[1] / length);
      rotate(angle);

      rectMode(CENTER);

      let innerLength = max(0.02, length - 0.12);
      let cx = length / 2;
      let cy = 0;

      if (isWing) {
        // pick upper vs lower color
        let baseCol   = this.name.includes("upper_wing") ? WING_FILL_1 : WING_FILL_2;

        // subtle drop shadow under the wing
        noStroke();
        fill(0, 0, 0, 45);
        rect(cx, cy + 0.015, innerLength * 1.02, segmentThickness * 1.05, segmentThickness * 0.7);

        // outer main wing
        stroke(WING_OUTLINE);
        strokeWeight(0.012);
        fill(baseCol);
        rect(cx, cy, innerLength, segmentThickness, segmentThickness * 0.7);

        // inner “gradient” stripe
        let stripeCol = lerpColor(baseCol, color(255, 255, 255, 0), 0.45);
        noStroke();
        fill(stripeCol);
        rect(cx, cy, innerLength * 0.7, segmentThickness * 0.65, segmentThickness * 0.5);

        // small spots
        fill(255, 255, 255, 230);
        circle(cx + innerLength * 0.18, cy + segmentThickness * 0.22, 0.03);
        circle(cx - innerLength * 0.2,  cy - segmentThickness * 0.20, 0.025);
        circle(cx,                     cy,                         0.022);

      } else if (isAntenna) {
        // slim antenna segment
        stroke(WING_OUTLINE);
        strokeWeight(0.01);
        fill(255, 255, 255, 210);
        rect(cx, cy, innerLength, segmentThickness, segmentThickness * 0.9);

        // little bulb at the tip
        noStroke();
        fill(WING_FILL_1);
        circle(length, 0, 0.04);

      } else if (isBody) {
        // main dark body bar
        stroke(WING_OUTLINE);
        fill(BODY_FILL);
        rect(cx, cy, innerLength, segmentThickness, segmentThickness * 0.6);

        // lighter center stripe
        noStroke();
        fill(90, 60, 40, 230);
        rect(cx, cy, innerLength * 0.7, segmentThickness * 0.55, segmentThickness * 0.4);
      }
    }

    pop();
  }
}

class Hinge extends Transformation {
  constructor(name, theta = 0.0) {
    super(name);
    this._theta = theta;
    this.T = math.identity([3]);
    this.dT = math.zeros([3, 3]);
  }

  num_dofs() { return 1; }
  get_dof() { return this._theta; }
  set_dof(value = 0.0) { this._theta = value; }

  local_transform() {
    let cth = math.cos(this._theta);
    let sth = math.sin(this._theta);
    this.T = [
      [cth, -sth, 0.0],
      [sth,  cth, 0.0],
      [0.0,  0.0, 1.0],
    ];
    return this.T;
  }

  local_derivative() {
    let cth = math.cos(this._theta);
    let sth = math.sin(this._theta);
    this.dT = [
      [-sth, -cth, 0.0],
      [ cth, -sth, 0.0],
      [ 0.0,  0.0, 0.0],
    ];
    return this.dT;
  }

  draw() {
    push();
    let origin = this.global_position();

    const isWingJoint =
      this.name.includes("upper_wing") || this.name.includes("lower_wing");

    const baseR   = isWingJoint ? 0.13 : 0.11;
    const midR    = isWingJoint ? 0.09 : 0.08;
    const innerR  = isWingJoint ? 0.055 : 0.06;

    // outer ring
    stroke(isWingJoint ? WING_FILL_2 : JOINT_OUTLINE);
    strokeWeight(0.014);
    fill(JOINT_FILL);
    circle(origin[0], origin[1], baseR);

    if (isWingJoint) {
      // extra colored ring for wing joints
      stroke(WING_FILL_1);
      strokeWeight(0.011);
      noFill();
      circle(origin[0], origin[1], midR);
    }

    // inner disc
    noStroke();
    fill(isWingJoint ? WING_FILL_1 : WING_OUTLINE);
    circle(origin[0], origin[1], innerR);

    pop();
  }
}

class Translation extends Transformation {
  constructor(name, axis, value = 0.0) {
    super(name);
    this._value = value;
    this.axis = axis;

    if (axis === "x") {
      this.axis_index = 0;
    } else if (axis === "y") {
      this.axis_index = 1;
    }
    this.T = math.identity([3]);
    this.dT = math.zeros([3, 3]);
  }

  num_dofs() {
    return 1;
  }

  get_dof() {
    return this._value;
  }

  set_dof(value = 0.0) {
    this._value = value;
  }

   local_transform() {
    this.T = math.subset(this.T, math.index(this.axis_index, 2), this._value);
    return this.T;
  }

  local_derivative() {
    this.dT = math.subset(this.dT, math.index(this.axis_index, 2), 1.0);
    return this.dT;
  }
	
	draw() {

	}

}

class Point {
  constructor(mouse_x, mouse_y, tr) {
    this.local_pos = math.multiply(math.inv(tr.global_transform()), [mouse_x, mouse_y, 1]);
		this.tr = tr;
		this.target_pos = [mouse_x, mouse_y];
  }
  draw() {
		let pos = math.multiply(this.tr.global_transform(), this.local_pos);
    push();
		stroke(GREEN);
		fill(GREEN);
    strokeWeight(0.01);
		circle(pos[0], pos[1], 0.02);
		pop();
	}	
	
	draw_target() {
    push();
		stroke(GREEN);
    strokeWeight(0.01);
		noFill();
		circle(this.target_pos[0], this.target_pos[1], 0.05);
		pop();
	}	
}

