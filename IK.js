// STUDENT'S CODE STARTS

function take_IK_step() {
  let ndofs = q.length;
  let g = math.zeros([ndofs]);

  let step_size = 0.05;

  if (IK_points.length === 0) return;

  let w = 1.0 / IK_points.length;

  IK_points.forEach((p) => {

    let T_point = p.tr.global_transform();
    let cur_pos = [T_point[0][2], T_point[1][2]];
    let error = math.subtract(p.target_pos, cur_pos);

    let J = compute_jacobian(p.tr);

    let step = new Array(ndofs).fill(0);
    for (let i = 0; i < ndofs; i++) {
      step[i] = J.get([0,i]) * error[0] + J.get([1,i]) * error[1];
      step[i] *= w;
    }

    g = math.add(g, step);
  });

  // Only update joint DOFs once 
  for (let i = 0; i < ndofs; i++) {
    q[i] += step_size * g[i];
  }

  // Now push the updated q into the model 
  set_joint_positions(q);
}


function compute_jacobian(body_point) {
  let ndofs = dof_list.length;
  let J = math.zeros([2, ndofs]);

  for (let i = 0; i < ndofs; i++) {
    let transform = dof_list[i];

    // Only joints that affect this point
    if (!body_point.dependent_dofs.has(transform)) continue;

    let tempJ = J.valueOf();

    // Translation Joint
	if (transform instanceof Translation) {
	
	    // local direction in 2D
	    let axis_local = transform.axis === "x" ? [1, 0] : [0, 1];
	
	    // full global transform
	    let G = transform.global_transform();
	
	    // rotate local axis by global rotation
	    let axis_world = [
	        G[0][0] * axis_local[0] + G[0][1] * axis_local[1],
	        G[1][0] * axis_local[0] + G[1][1] * axis_local[1]
	    ];
	
	    tempJ[0][i] = axis_world[0];
	    tempJ[1][i] = axis_world[1];
	
	    J = math.matrix(tempJ);
	}


    // Hinge joint
    else if (transform instanceof Hinge) {

      let joint_pos = transform.global_position();
      let point_pos = body_point.global_position();
      let r = math.subtract(point_pos, joint_pos);

      let J_column = [-r[1], r[0]];

      tempJ[0][i] = J_column[0];
      tempJ[1][i] = J_column[1];
      J = math.matrix(tempJ);
    }
  }

  return J;
}

// STUDENT'S CODE ENDS
