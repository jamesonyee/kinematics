// STUDENT'S CODE STARTS

function take_IK_step() {
  // return the gradient of the IK residual, a 1d array of length ndofs
  let g = math.zeros([q.length]);
  let step_size = 0.1;

  // Iterate over all IK points
  IK_points.forEach((p) => {
    // Current and target position
    let T_point = p.tr.global_transform();
    let cur_pos = math.flatten(math.subset(T_point, math.index([0, 1], 2)));
    let target_pos = p.target_pos;
    let error = math.subtract(target_pos, cur_pos);

     // Compute Jacobian
    let J = compute_jacobian(p.tr);
    
    // Compute gradient step
    let step = new Array(q.length).fill(0);
    for (let i = 0; i < q.length; i++) {
      step[i] = J.get([0, i]) * error[0] + J.get([1, i]) * error[1];
    }
    
    //Accumulate gradient from all IK points
    g = math.add(g, step);
  });

  // Apply gradient step  to update joint positions
  for (let i = 0; i < q.length; i++) {
    q[i] += step_size * g[i];
    dof_list[i].set_dof(q[i]);
  }

  return g;
}

function compute_jacobian(body_point) {
  // return the Jacobian matrix, a 2xN matrix

  let ndofs = dof_list.length;
  let J = math.zeros([2, ndofs]);

  for (let i = 0; i < ndofs; i++) {
    let transform = dof_list[i];
    
     //Only joints that affect this point
    if (!body_point.dependent_dofs.has(transform)) continue;

    
    if (transform instanceof Translation) {
      let axis_vec = transform.axis === "x" ? [1, 0] : [0, 1];
      
      let tempJ = J.valueOf();
      tempJ[0][i] = axis_vec[0];
      tempJ[1][i] = axis_vec[1];
      J = math.matrix(tempJ);
      
    } else if (transform instanceof Hinge) {
      let joint_pos = transform.global_position();
      let point_pos = body_point.global_position();
      let r = math.subtract(point_pos, joint_pos);
      
      let J_column = [-r[1], r[0]];
      
      // Fill the Jacobian column
      let tempJ = J.valueOf();
      tempJ[0][i] = J_column[0];
      tempJ[1][i] = J_column[1];
      J = math.matrix(tempJ);
    }
  }

  return J;
}
// STUDENT'S CODE ENDS
