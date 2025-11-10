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

  num_dofs() {
    return 0;
  }

  local_transform() {
    return this._value;
  }
	
	draw() {
		let limb_width = 0.04;
		push();
		strokeWeight(0.01);
		stroke(PURPLE);	
		let mat = math.flatten(
      math.transpose(math.subset(this.parent.global_transform(), math.index([0, 1], [0,1,2])))
			);
		applyMatrix(mat);
		
		let tip = math.flatten(math.subset(this._value, math.index([0, 1], 2)));
		let length = math.norm(tip);
		if (length > TINYNUMBER){		
			let rotate_radian;
			if (tip[0] > 0)
				rotate_radian = math.asin(math.divide(tip[1], length));
			else
				rotate_radian = PI - math.asin(math.divide(tip[1], length));
			rotate(rotate_radian);
			line(0.05, limb_width, length - 0.05, limb_width);
			line(0.05, -limb_width, length - 0.05, -limb_width);
			noFill();
			arc(0, 0, 0.13, 0.13, -PI * 0.2, PI * 0.2);
			if (this.end_effector)
				arc(length - 0.1, 0, 0.13, 0.13, PI * -0.2, PI * 0.2);
			else
				arc(length, 0, 0.13, 0.13, PI * 0.8, PI * 1.2);			
		}		
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

class Hinge extends Transformation {
  constructor(name, theta = 0.0) {
    super(name);
    this._theta = theta;
    this.T = math.identity([3]);
    this.dT = math.zeros([3, 3]);
  }

  num_dofs() {
    return 1;
  }

  get_dof() {
    return this._theta;
  }

  set_dof(value = 0.0) {
    this._theta = value;
  }

    local_transform() {
    let cth = math.cos(this._theta);
    let sth = math.sin(this._theta);

    this.T = [
      [cth, -sth, 0.0],
      [sth, cth, 0.0],
      [0.0, 0.0, 1.0],
    ];
    return this.T;
  }

  local_derivative() {
    let cth = math.cos(this._theta);
    let sth = math.sin(this._theta);

    this.dT = [
      [-sth, -cth, 0.0],
      [cth, -sth, 0.0],
      [0.0, 0.0, 0.0],
    ];
    return this.dT;
  }
	
	draw() {
		push();
		let origin = this.global_position();
		strokeWeight(0.01);
		stroke(PURPLE);	
		noFill();
		circle(origin[0], origin[1], 0.1);
		fill(PURPLE);
		circle(origin[0], origin[1], 0.05);
		pop();		
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

