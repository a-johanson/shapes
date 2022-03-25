
glMatrix.setMatrixArrayType(Array);

var prng = new Math.seedrandom("so many colorful shapes");
function rand(min, max) {
    return (max - min) * prng() + min;
}

class Twig {
    constructor(x, y, z, dir_s, dir_t, growth_speed, ttl) {
        this.branches = [];
        this.growth_sites = [new GrowthSite(x, y, z, dir_s, dir_t, growth_speed, ttl, 0)];
    }

    grow() {
        while(this.growth_sites.length > 0) {
            this.grow_branch(this.growth_sites.pop());
        }
    }

    grow_branch(gs) {
        const branching_angle = Math.PI / 6.0;

        let branch = [gs.clone_position()];
        while (gs.ttl > 0) {
            gs.step();
            branch.push(gs.clone_position());

            const dir = sphericalToCartesian(gs.dir_s, gs.dir_t);
            const angle = Math.acos(vec3.dot(dir, gs.initial_direction));
            if (angle >= branching_angle) {
                this.growth_sites.push(new GrowthSite(
                    gs.position[0],
                    gs.position[1],
                    gs.position[2],
                    2.0 * gs.initial_dir_s - gs.dir_s,
                    2.0 * gs.initial_dir_t - gs.dir_t,
                    gs.growth_speed,
                    0.75 * gs.ttl,
                    gs.generation + 1
                ));
                gs.initial_dir_s = gs.dir_s;
                gs.initial_dir_t = gs.dir_t;
                gs.initial_direction = dir;
            }
        }
        this.branches.push(branch);
    }
}

class GrowthSite {
    constructor(x, y, z, dir_s, dir_t, growth_speed, ttl, generation) {
        this.position = vec3.fromValues(x, y, z);
        this.dir_s = dir_s;
        this.dir_t = dir_t;
        this.initial_dir_s = dir_s;
        this.initial_dir_t = dir_t;
        this.initial_direction = sphericalToCartesian(dir_s, dir_t);
        this.growth_speed = growth_speed;
        this.ttl = ttl;
        this.generation = generation;
        // this.color = color;
    }

    clone_position() {
        return vec3.clone(this.position);
    }

    step() {
        if (this.ttl <= 0) {
            return;
        }

        const max_angle_incr = Math.PI / 32.0;
        this.dir_s += rand(-max_angle_incr, max_angle_incr);
        this.dir_t += rand(-max_angle_incr, max_angle_incr);

        const dir = sphericalToCartesian(this.dir_s, this.dir_t);
        vec3.scaleAndAdd(this.position, this.position, dir, this.growth_speed);
        this.ttl -= 1;
    }
}

function sphericalToCartesian(s, t) {
    return vec3.fromValues(
        Math.sin(t),
        Math.cos(s) * Math.cos(t),
        Math.sin(s) * Math.cos(t)
    );
}

const canvasDim = [600, 800];

let alpha = -60.0;
let beta  = 4.0;
let gamma = 0.0;

const bg = vec3.fromValues(250, 247, 242);

function projectionMatrix() {
    let projection = mat4.create();
    mat4.perspective(projection, glMatrix.toRadian(70.0), canvasDim[0] / canvasDim[1], 0.1);
    return projection;
}

function viewMatrix() {
    const eye     = vec3.fromValues(0.0, Math.sqrt(Math.max(0.1, beta)), 5.0);
    const center  = vec3.fromValues(0.0, 0.0, 0.0);
    const up      = vec3.fromValues(0.0, 1.0, 0.0);
    let view      = mat4.create();
    mat4.lookAt(view, eye, center, up);
    return view;
}

function screenProjection(projection, view, model, points) {
    let mvp = mat4.create();
    mat4.mul(mvp, view, model);
    mat4.mul(mvp, projection, mvp);

    const canvasCoords = points.map(function(v) {
        let p = vec3.create();
        vec3.transformMat4(p, v, mvp);
        p[0] = 0.5 * canvasDim[0] * (1 + p[0]);
        p[1] = 0.5 * canvasDim[1] * (1 - p[1]);
        return p;
    });
    return canvasCoords;
}

function drawLineStrip(points) {
    beginShape(LINES);

    const p_first = points[0];
    vertex(p_first[0], p_first[1]);

    for(let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        vertex(p[0], p[1]);
        vertex(p[0], p[1]);
    }

    const p_last = points[points.length - 1];
    vertex(p_last[0], p_last[1]);

    endShape();
}

let twig = new Twig(0, 0, 0, 0, 0, 0.01, 150);

function setup() {
    createCanvas(canvasDim[0], canvasDim[1]);
    strokeWeight(1);

    twig.grow();
}

const square = [
    vec3.fromValues(-1, 0, -1),
    vec3.fromValues(1, 0, -1),
    vec3.fromValues(1, 0, 1),
    vec3.fromValues(-1, 0, 1)
];

function draw() {
    background(bg[0], bg[1], bg[2]);

    const projection = projectionMatrix();
    const view = viewMatrix();
    let model = mat4.create();
    mat4.fromYRotation(model, glMatrix.toRadian(alpha));

    p_square = screenProjection(projection, view, model, square);
    strokeWeight(1);
    fill(255);
    stroke(0);
    beginShape();
    p_square.forEach(p => {
        vertex(p[0], p[1]);
    });
    endShape(CLOSE);

    const light = vec4.fromValues(0.5 + Math.cos(glMatrix.toRadian(gamma)), 2, Math.sin(glMatrix.toRadian(gamma)), 1);
    const plane = vec4.fromValues(0, 1, 0, 0);
    const plane_dot_light = vec4.dot(plane, light);
    const shadowProjection = mat4.fromValues(
        light[0] * plane[0] - plane_dot_light, light[1] * plane[0], light[2] * plane[0], light[3] * plane[0],
        light[0] * plane[1], light[1] * plane[1] - plane_dot_light, light[2] * plane[1], light[3] * plane[1],
        light[0] * plane[2], light[1] * plane[2], light[2] * plane[2] - plane_dot_light, light[3] * plane[2],
        light[0] * plane[3], light[1] * plane[3], light[2] * plane[3], light[3] * plane[3] - plane_dot_light
    );

    p_light = screenProjection(projection, view, model, [light]);
    const p_branches = twig.branches.map(function(b) {
        return screenProjection(projection, view, model, b);
    });
    mat4.mul(model, model, shadowProjection);
    const p_shadows = twig.branches.map(function(b) {
        return screenProjection(projection, view, model, b);
    });

    strokeWeight(3);
    noFill();
    stroke(120);
    p_shadows.forEach(function(p) {
        drawLineStrip(p);
    });
    stroke(0);
    p_branches.forEach(function(p) {
        drawLineStrip(p);
    });

    strokeWeight(10);
    stroke(255, 0, 0);
    point(p_light[0][0], p_light[0][1]);

    gamma += 0.7;
}

function mouseDragged(event) {
    const sensitivity = 0.2;
    alpha += sensitivity * event.movementX;
    beta  += sensitivity * event.movementY;
    // console.log("alpha = " + alpha + " deg, beta = " + beta + " deg");
}
