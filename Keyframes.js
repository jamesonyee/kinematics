class Keyframes {
	constructor() {
    this.keys = [];
		let pose1 = [...q]
		let pose2 = [...q]
		this.keys.push([0, pose1]);
		this.keys.push([NUM_OF_FRAMES - 1, pose2]);
		this.interpolated_frames = [];
		for (let i = 0; i < NUM_OF_FRAMES; i++) {
			let pose = math.zeros([dof_list.length]);
			this.interpolated_frames.push(pose);
		}
  }

	add_keyframe(time, pose) {
		for (let i = 0; i < this.keys.length; i++) {
			if (this.keys[i][0] >= time) {
				if (this.keys[i][0] == time)
					this.keys.splice(i, 1);
				this.keys.splice(i, 0, [time, pose]);
				break;
			}
		}
	}
	
	linear_interpolation() {
	  // Initialize an array of NUM_OF_FRAMES poses so indices 0..NUM_OF_FRAMES-1 exist
	  this.interpolated_frames = [];
	  for (let i = 0; i < NUM_OF_FRAMES; i++) {
	    this.interpolated_frames[i] = math.zeros([dof_list.length]);
	  }
	
	  // Fill segments between keyframes
	  for (let i = 0; i < this.keys.length - 1; i++) {
	    let first_key  = this.keys[i];
	    let second_key = this.keys[i + 1];
	
	    let t0 = first_key[0];
	    let t1 = second_key[0];
	    let duration = t1 - t0;
	    if (duration <= 0) continue;
	
	    let pose_diff = math.subtract(second_key[1], first_key[1]);
	    let curr_frame = t0;
	
	    while (curr_frame <= t1 && curr_frame < NUM_OF_FRAMES) {
	      let alpha = (curr_frame - t0) / duration;
	      let curr_pose = math.add(first_key[1], math.multiply(pose_diff, alpha));
	      this.interpolated_frames[curr_frame] = curr_pose;
	      curr_frame++;
	    }
	  }
	}
		
	catmull_rom_interpolation() {
	  if (this.keys.length < 2) return;
	
	  // Initialize frames
	  this.interpolated_frames = [];
	  for (let i = 0; i < NUM_OF_FRAMES; i++) {
	    this.interpolated_frames[i] = math.zeros([dof_list.length]);
	  }
	
	  for (let i = 0; i < this.keys.length - 1; i++) {
		  let idx0 = Math.max(0, i - 1);
		  let idx1 = i;
		  let idx2 = i + 1;
		  let idx3 = Math.min(this.keys.length - 1, i + 2);
		  let posePrev = this.keys[idx0][1];
		  let poseStart = this.keys[idx1][1];
		  let poseNext = this.keys[idx2][1];
		  let poseFuture = this.keys[idx3][1];
		  let tBegin = this.keys[idx1][0];
		  let tEnd  = this.keys[idx2][0];
		  let span = tEnd - tBegin;
		  if (span <= 0) {
		    continue;
		  }
		  
	    for (let step = 0; step <= span; step++) {
	      let u  = step / span;
			let jointCount = poseStart.length;
	      let uSquared = u * u;
	      let uCubed = u * u * u;
	  
	      let frame = [];
	      for (let iter = 0; iter < jointCount; iter++) {
			  let vPrev   = posePrev[iter];
			  let vStart  = poseStart[iter];
			  let vNext   = poseNext[iter];
			  let vFuture = poseFuture[iter];

			  let offset0 = vStart;
			  let diff1   = vNext - vPrev;
			  let offset1 = 0.5 * diff1;
			
			  let partA   = 2 * vPrev;
			  let partB   = -5 * vStart;
			  let partC   = 4 * vNext;
			  let partD   = -vFuture;
			  let sum2    = partA + partB + partC + partD;
			  let offset2 = 0.5 * sum2;
			
			  let partE   = -vPrev;
			  let partF   = 3 * vStart;
			  let partG   = -3 * vNext;
			  let partH   = vFuture;
			  let sum3    = partE + partF + partG + partH;
			  let offset3 = 0.5 * sum3;

			  let cubicTerm    = offset3 * uCubed;
			  let quadraticTerm = offset2 * uSquared;
			  let linearTerm   = offset1 * u;
			  let constantTerm = offset0;
			
			  let value = cubicTerm + quadraticTerm + linearTerm + constantTerm;
			  frame.push(value);
			}
	
	      let frameIndex = tBegin + step;		
			let withinLower = frameIndex >= 0;
			let withinUpper = frameIndex < NUM_OF_FRAMES;
			
			if (withinLower && withinUpper) {
	        this.interpolated_frames[frameIndex] = frame;
	      }
	    }
	  }
	}
	
	bspline_interpolation() {
	  if (this.keys.length < 2) return;
	
	  // Initialize frames
	  this.interpolated_frames = [];
	  for (let i = 0; i < NUM_OF_FRAMES; i++) {
	    this.interpolated_frames[i] = math.zeros([dof_list.length]);
	  }
	
	  // Pad keys as de Boor-like control points
	  let keys = [
	    this.keys[0], this.keys[0],
	    ...this.keys,
	    this.keys[this.keys.length - 1], this.keys[this.keys.length - 1]
	  ];
	
	  for (let i = 0; i < this.keys.length - 1; i++) {
	    let p0 = keys[i][1];
	    let p1 = keys[i + 1][1];
	    let p2 = keys[i + 2][1];
	    let p3 = keys[i + 3][1];
	
	    let t_start = this.keys[i][0];
	    let t_end   = this.keys[i + 1][0];
	    let duration = t_end - t_start;
	    if (duration <= 0) continue;
	
	    for (let t = 0; t <= duration; t++) {
	      let u  = t / duration;
	      let u2 = u * u;
	      let u3 = u2 * u;
	
	      let b0 = (1 - u) ** 3 / 6;
	      let b1 = (3 * u3 - 6 * u2 + 4) / 6;
	      let b2 = (-3 * u3 + 3 * u2 + 3 * u + 1) / 6;
	      let b3 = u3 / 6;
	
	      let frame = [];
	      for (let k = 0; k < p1.length; k++) {
	        let val = b0 * p0[k] + b1 * p1[k] + b2 * p2[k] + b3 * p3[k];
	        frame.push(val);
	      }
	
	      let idx = t_start + t;
	      if (idx >= 0 && idx < NUM_OF_FRAMES) {
	        this.interpolated_frames[idx] = frame;
	      }
	    }
	  }
	}
	
		
	draw_trajectory() {
	  if (animating_joint_id >= 0) {
	    for (let i = 0; i < NUM_OF_FRAMES; i++) {
	      let frame = this.interpolated_frames[i];
	      if (!frame || frame[animating_joint_id] === undefined) continue;
	
	      push();
	      stroke(GREEN);
	      strokeWeight(0.01);
	      fill(GREEN);
	      let x = timeline_origin[0] + timeline_width * i / NUM_OF_FRAMES;
	      let y = timeline_origin[1] + frame[animating_joint_id] * 0.1;
	      point(x, y);
	      pop();
	    }
	  }
	
	  for (let i = 0; i < this.keys.length; i++) {
	    push();
	    stroke(ORANGE);
	    if (this.keys[i][0] == current_frame)
	      strokeWeight(0.03);
	    else
	      strokeWeight(0.01);
	    let p1 = [
	      timeline_origin[0] + timeline_width * this.keys[i][0] / NUM_OF_FRAMES,
	      timeline_origin[1] + timeline_height * 0.5
	    ];
	    let p2 = [
	      timeline_origin[0] + timeline_width * this.keys[i][0] / NUM_OF_FRAMES,
	      timeline_origin[1] - timeline_height * 0.5
	    ];
	    line(p1[0], p1[1], p2[0], p2[1]);
	    pop();
	  }
	}

}
