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
    // Fill all NUM_OF_FRAMES with piecewise linear interpolation
    this.interpolated_frames = [];
    for (let i = 0; i < NUM_OF_FRAMES; i++) {
      this.interpolated_frames.push(math.zeros([dof_list.length]));
    }

    if (this.keys.length === 0) return;

    // If only one key, just hold that pose
    if (this.keys.length === 1) {
      for (let f = 0; f < NUM_OF_FRAMES; f++) {
        this.interpolated_frames[f] = this.keys[0][1];
      }
      return;
    }

    // Walk through frames 0..NUM_OF_FRAMES-1
    let kIndex = 0;
    for (let f = 0; f < NUM_OF_FRAMES; f++) {
      // advance segment if needed so that keys[kIndex].time <= f <= keys[kIndex+1].time
      while (
        kIndex < this.keys.length - 2 &&
        this.keys[kIndex + 1][0] < f
      ) {
        kIndex++;
      }

      let keyA = this.keys[kIndex];
      let keyB = this.keys[kIndex + 1];

      let t0 = keyA[0];
      let t1 = keyB[0];

      let u;
      if (t1 === t0) {
        u = 0.0;
      } else {
        u = (f - t0) / (t1 - t0);
        u = Math.max(0.0, Math.min(1.0, u));
      }

      let poseDiff = math.subtract(keyB[1], keyA[1]);
      let pose = math.add(keyA[1], math.multiply(poseDiff, u));
      this.interpolated_frames[f] = pose;
    }
  }

  catmull_rom_interpolation() {
    // If not enough keys, just use linear
    if (this.keys.length < 2) {
      this.linear_interpolation();
      return;
    }
    if (this.keys.length < 3) {
      this.linear_interpolation();
      return;
    }

    const n = this.keys.length;

    // Precompute tangents at each keyframe (Catmull-Rom)
    let tangents = new Array(n);

    if (n === 2) {
      let diff = math.subtract(this.keys[1][1], this.keys[0][1]);
      tangents[0] = diff;
      tangents[1] = diff;
    } else {
      // Endpoints
      tangents[0] = math.subtract(this.keys[1][1], this.keys[0][1]);
      tangents[n - 1] = math.subtract(
        this.keys[n - 1][1],
        this.keys[n - 2][1]
      );
      // Interior points
      for (let i = 1; i < n - 1; i++) {
        let diff = math.subtract(this.keys[i + 1][1], this.keys[i - 1][1]);
        tangents[i] = math.multiply(0.5, diff);
      }
    }

    // Prepare buffer
    this.interpolated_frames = [];
    for (let i = 0; i < NUM_OF_FRAMES; i++) {
      this.interpolated_frames.push(math.zeros([dof_list.length]));
    }

    // Hermite interpolation between each pair of keyframes
    for (let k = 0; k < n - 1; k++) {
      let t0 = this.keys[k][0];
      let t1 = this.keys[k + 1][0];
      let duration = t1 - t0;
      if (duration <= 0) continue;

      let P1 = this.keys[k][1];
      let P2 = this.keys[k + 1][1];
      let m1 = tangents[k];
      let m2 = tangents[k + 1];

      for (let f = t0; f <= t1 && f < NUM_OF_FRAMES; f++) {
        let u = (f - t0) / duration;
        let u2 = u * u;
        let u3 = u2 * u;

        // Hermite basis
        let h00 = 2 * u3 - 3 * u2 + 1;
        let h10 = u3 - 2 * u2 + u;
        let h01 = -2 * u3 + 3 * u2;
        let h11 = u3 - u2;

        let term1 = math.multiply(h00, P1);
        let term2 = math.multiply(h10, m1);
        let term3 = math.multiply(h01, P2);
        let term4 = math.multiply(h11, m2);

        let pose = math.add(
          math.add(term1, term2),
          math.add(term3, term4)
        );

        this.interpolated_frames[f] = pose;
      }
    }
  }

  bspline_interpolation() {
    // Need at least 4 keyframes for cubic B-spline
    if (this.keys.length < 4) {
      this.linear_interpolation();
      return;
    }

	this.interpolated_frames = [];
	for (let i = 0; i < NUM_OF_FRAMES; i++) {
	    this.interpolated_frames.push(math.zeros([dof_list.length]));
	}

    const n = this.keys.length;

    // Each segment uses 4 control points: k0..k3
    // and spans from time of k1 to time of k2
    for (let s = 0; s <= n - 4; s++) {
      let k0 = this.keys[s];
      let k1 = this.keys[s + 1];
      let k2 = this.keys[s + 2];
      let k3 = this.keys[s + 3];

      let tStart = k1[0];
      let tEnd = k2[0];
      let duration = tEnd - tStart;
      if (duration <= 1) continue;

      let P0 = k0[1];
      let P1 = k1[1];
      let P2 = k2[1];
      let P3 = k3[1];

      // We keep exact key poses at tStart and tEnd,
		for (let f = tStart; f <= tEnd && f < NUM_OF_FRAMES; f++) {
		    let u = (f - tStart) / duration;
		    let u2 = u * u;
		    let u3 = u2 * u;
		
		    // Uniform cubic B-spline basis
		    let B0 = (1 - 3*u + 3*u2 - u3) / 6.0;
		    let B1 = (4 - 6*u2 + 3*u3) / 6.0;
		    let B2 = (1 + 3*u + 3*u2 - 3*u3) / 6.0;
		    let B3 = u3 / 6.0;
		
		    let pose = math.add(
		        math.add(
		            math.multiply(B0, P0),
		            math.multiply(B1, P1)
		        ),
		        math.add(
		            math.multiply(B2, P2),
		            math.multiply(B3, P3)
		        )
		    );
		
		    this.interpolated_frames[f] = pose;
		}

    }
  }

	
	draw_trajectory() {
		if (animating_joint_id >= 0) {
			for(let i = 0; i < NUM_OF_FRAMES; i++){
				push();
				stroke(GREEN);
				strokeWeight(0.01);
				fill(GREEN);
				let x = timeline_origin[0] + timeline_width * i / NUM_OF_FRAMES;
				let y = timeline_origin[1] + this.interpolated_frames[i][animating_joint_id] * 0.1;
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
			let p1 = [timeline_origin[0] + timeline_width * this.keys[i][0] / NUM_OF_FRAMES, timeline_origin[1] + timeline_height * 0.5];
			let p2 = [timeline_origin[0] + timeline_width * this.keys[i][0] / NUM_OF_FRAMES, timeline_origin[1] - timeline_height * 0.5];
			line(p1[0], p1[1], p2[0], p2[1]);
			pop();
		}
	}
}
