"""The visa wall: five lit niches, one object per visa. Pure procedural, no external assets.
Run: Blender -b --factory-startup -P blender/gallery.py -- <out_dir> <job> [samples]
Jobs: wall | lit | detail:<slug> | dolly:<slug> | tall:<slug>
"""
import bpy, sys, math, os
from mathutils import Vector

out, job = sys.argv[sys.argv.index("--") + 1 :][:2]
args = sys.argv[sys.argv.index("--") + 3 :]
SAMPLES = int(args[0]) if args else 96
SLUGS = ["visa-exempt", "dtv", "ltr", "privilege", "retirement"]
PITCH, FRAMES = 1.62, 40
# niche glaze, linear-ish sRGB hex
GLAZE = {"visa-exempt": "#E8795A", "dtv": "#1FA39B", "ltr": "#E0A22E", "privilege": "#7A4A86", "retirement": "#7FB48C"}


def rgb(h, a=1.0):
    c = [int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (a,)


for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
scene = bpy.context.scene


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, bump=0.0, bscale=12.0, vary=0.0, vscale=3.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    c = rgb(color)
    p.inputs["Base Color"].default_value = c
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = 0.08
    for k, v in kw.items():
        p.inputs[k.replace("_", " ")].default_value = v
    tc = nt.nodes.new("ShaderNodeTexCoord")
    if vary:
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = vscale
        n.inputs["Detail"].default_value = 8
        r = nt.nodes.new("ShaderNodeMapRange")
        r.inputs["From Min"].default_value, r.inputs["From Max"].default_value = 0.3, 0.7
        r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = 1 - vary, 1 + vary
        mx = nt.nodes.new("ShaderNodeVectorMath")
        mx.operation = "SCALE"
        mx.inputs[0].default_value = c[:3]
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        nt.links.new(n.outputs[0], r.inputs["Value"])
        nt.links.new(r.outputs[0], mx.inputs["Scale"])
        nt.links.new(mx.outputs[0], p.inputs["Base Color"])
    if bump:
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = bscale
        n.inputs["Detail"].default_value = 10
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = 0.02
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        nt.links.new(n.outputs[0], b.inputs["Height"])
        nt.links.new(b.outputs[0], p.inputs["Normal"])
    return m


M = dict(
    wall=mat("wall", "#1B5C5C", 0.62, bump=0.55, bscale=5, vary=0.22, vscale=1.6),
    floor=mat("floor", "#0C2B2D", 0.09, bump=0.03, bscale=3),
    gold=mat("gold", "#E7B04A", 0.22, 1.0, bump=0.06, bscale=20),
    brass=mat("brass", "#D9A441", 0.18, 1.0, bump=0.04, bscale=14),
    stone=mat("stone", "#EDE6D8", 0.32, coat=0.3, vary=0.06, vscale=5),
    coral=mat("coral", "#F0684A", 0.28, coat=0.6),
    coral2=mat("coral2", "#D44E33", 0.3, coat=0.6),
    black=mat("black", "#15191B", 0.35),
    steel=mat("steel", "#D5D9DA", 0.2, 1.0),
    leather=mat("leather", "#8A4B2A", 0.5, bump=0.3, bscale=60),
    navy=mat("navy", "#0F2C46", 0.55, bump=0.35, bscale=90),
    cream=mat("cream", "#F6EFDD", 0.75),
    wood=mat("wood", "#B9793F", 0.4, coat=0.25, vary=0.25, vscale=9),
    plum=mat("plum", "#2A1230", 0.25, 0.55, coat=0.8),
    jade=mat("jade", "#2F8A66", 0.85, bump=0.4, bscale=160),
    canvas=mat("canvas", "#FBF4E4", 0.9, bump=0.4, bscale=160),
)
for s, h in GLAZE.items():
    M[s] = mat("glaze-" + s, h, 0.34, 0.0, coat=0.5, bump=0.5, bscale=9, vary=0.16, vscale=4)


def add(o, m=None, bevel=0.0, seg=4, smooth=True):
    o = o if o else bpy.context.object
    if m:
        o.data.materials.clear()
        o.data.materials.append(M[m])
    if bevel:
        b = o.modifiers.new("b", "BEVEL")
        b.width, b.segments, b.limit_method = bevel, seg, "ANGLE"
    if smooth and o.type == "MESH":
        for p in o.data.polygons:
            p.use_smooth = True
        o.modifiers.new("wn", "WEIGHTED_NORMAL")
    return o


def box(loc, dim, m, bevel=0.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return add(o, m, bevel)


def cyl(loc, r, h, m, bevel=0.004, rot=(0, 0, 0), v=64):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=v)
    return add(None, m, bevel, 3)


def torus(loc, R, r, m, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=96, minor_segments=24)
    return add(None, m)


def lathe(loc, prof, m, steps=96):
    me = bpy.data.meshes.new("lathe")
    vs, fs, n = [], [], len(prof)
    for i in range(steps):
        a = 2 * math.pi * i / steps
        vs += [(r * math.cos(a), r * math.sin(a), z) for r, z in prof]
    for i in range(steps):
        j = (i + 1) % steps
        fs += [(i * n + k, j * n + k, j * n + k + 1, i * n + k + 1) for k in range(n - 1)]
    me.from_pydata(vs, [], fs)
    o = bpy.data.objects.new("lathe", me)
    scene.collection.objects.link(o)
    o.location = loc
    return add(o, m)


def text(body, loc, size, m, rot=(math.pi / 2, 0, 0), depth=0.002):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.data.body, o.data.size, o.data.extrude = body, size, depth
    o.data.align_x = "CENTER"
    o.data.align_y = "CENTER"
    o.data.materials.append(M[m])
    return o


def tube(pts, r, m, closed=False):
    cu = bpy.data.curves.new("t", "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution, cu.use_fill_caps = "3D", r, 6, True
    s = cu.splines.new("POLY")
    s.points.add(len(pts) - 1)
    for p, q in zip(s.points, pts):
        p.co = (*q, 1)
    s.use_cyclic_u = closed
    o = bpy.data.objects.new("t", cu)
    cu.materials.append(M[m])
    scene.collection.objects.link(o)
    return o


def group(start, loc, rotz=0.0, scale=1.0):
    """Parent everything created since `start` to an empty placed at loc."""
    e = bpy.data.objects.new("grp", None)
    scene.collection.objects.link(e)
    for o in [o for o in scene.objects if o not in start and o is not e and o.parent is None]:
        o.parent = e
    e.location, e.rotation_euler, e.scale = loc, (0, 0, rotz), (scale,) * 3
    return e


# ---- the wall with tapered, lotus-tipped niches (the shape of a temple window) ----
NW, NH, ND, Z0 = 0.98, 2.45, 0.85, 0.42  # width at base, height, depth, sill height


def niche_outline(w, h, taper=0.88, n=14):
    """Closed (x, z) outline, base at z=0: leaning sides, then two curves meeting in a point."""
    hw, top = w / 2, h * 0.66
    tw = hw * taper
    pts = [(-hw, 0), (hw, 0), (tw, top)]
    P0, P1, P2, P3 = (tw, top), (tw * 1.0, top + (h - top) * 0.62), (tw * 0.22, top + (h - top) * 0.62), (0, h)
    arc = []
    for i in range(1, n + 1):
        t = i / n
        arc.append(tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t**3 * d for a, b, c, d in zip(P0, P1, P2, P3)))
    pts += arc
    pts += [(-x, z) for x, z in reversed(arc[:-1])] + [(-tw, top)]
    return pts


def prism(outline, y0, y1, name):
    me = bpy.data.meshes.new(name)
    n = len(outline)
    vs = [(x, y0, z) for x, z in outline] + [(x, y1, z) for x, z in outline]
    fs = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me.from_pydata(vs, [], fs)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    return o


wall = box((0, 0.5, 2.6), (26, 1.0, 5.2), "wall", 0)
xs = {s: (i - 2) * PITCH for i, s in enumerate(SLUGS)}
for s, x in xs.items():
    c = prism(niche_outline(NW, NH), -0.2, ND, "cut")
    c.location = (x, 0, Z0)
    b = wall.modifiers.new("cut", "BOOLEAN")
    b.operation, b.object, b.solver = "DIFFERENCE", c, "EXACT"
    c.hide_render = True
    # liner: the same prism, open at the front, inside faces only
    li = prism(niche_outline(NW - 0.004, NH - 0.004), 0.02, ND - 0.004, "liner")
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(li.data)
    bm.faces.ensure_lookup_table()
    front = [f for f in bm.faces if all(abs(v.co.y - 0.02) < 1e-4 for v in f.verts)]
    bmesh.ops.delete(bm, geom=front, context="FACES")
    bm.to_mesh(li.data)
    bm.free()
    li.location = (x, 0, Z0)
    li.data.materials.append(M[s])
    # gilded frame, one outer moulding and one fine inner line
    tube([(x + px, -0.012, Z0 + pz) for px, pz in niche_outline(NW + 0.05, NH + 0.06)], 0.022, "gold", True)
    tube([(x + px, -0.004, Z0 - 0.04 + pz) for px, pz in niche_outline(NW + 0.17, NH + 0.2)], 0.006, "gold", True)
    box((x, -0.06, Z0 - 0.05), (NW + 0.22, 0.34, 0.07), "stone", 0.012)
    box((x, 0.36, Z0 + 0.06), (0.74, 0.5, 0.12), "stone", 0.012)
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, -15, 0))
add(None, "floor", smooth=False)
box((0, -0.02, 0.06), (26, 0.06, 0.12), "gold", 0.004)  # skirting line
Z = Z0 + 0.12  # top of the plinth

# ---- DTV: a carry-on ----
st = set(scene.objects)
box((0, 0, 0.45), (0.52, 0.27, 0.74), "coral", 0.07)
for i in range(9):
    x = -0.2 + i * 0.05
    if i != 4:
        for y in (-0.137, 0.137):
            box((x, y, 0.45), (0.018, 0.012, 0.62), "coral2", 0.006)
box((0, 0, 0.45), (0.53, 0.012, 0.745), "black", 0.004)
for x in (-0.19, 0.19):
    for y in (-0.085, 0.085):
        cyl((x, y, 0.045), 0.045, 0.035, "black", 0.008, (0, math.pi / 2, 0))
        box((x, y, 0.085), (0.06, 0.06, 0.03), "black", 0.01)
for x in (-0.13, 0.13):
    cyl((x, 0.05, 0.97), 0.011, 0.34, "steel")
box((0, 0.05, 1.145), (0.31, 0.04, 0.045), "black", 0.018)
tube([(-0.09, -0.02, 0.825), (-0.08, -0.02, 0.86), (0.08, -0.02, 0.86), (0.09, -0.02, 0.825)], 0.013, "black")
for z in (0.3, 0.6):
    box((0.0, -0.142, z), (0.5, 0.008, 0.018), "coral2", 0.003)
tube([(0.09, -0.04, 0.85), (0.12, -0.15, 0.8), (0.13, -0.16, 0.76)], 0.005, "leather")
box((0.135, -0.162, 0.69), (0.085, 0.012, 0.14), "leather", 0.006, (0, math.radians(8), 0))
group(st, (xs["dtv"], 0.36, Z), math.radians(-20), 1.14)

# ---- LTR: a brass key ----
st = set(scene.objects)
box((0, 0, 0.06), (0.36, 0.26, 0.12), "stone", 0.012)
cyl((0, 0, 0.52), 0.032, 0.83, "brass")
for z in (0.2, 0.24, 0.8, 0.84):
    torus((0, 0, z), 0.04, 0.014, "brass", (0, 0, 0))
torus((0, 0, 1.06), 0.13, 0.026, "brass")
for a in (math.pi / 2, math.pi, 0):  # trefoil bow
    torus((math.cos(a) * 0.2, 0, 1.06 + math.sin(a) * 0.2), 0.1, 0.026, "brass")
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=(0, 0, 1.06), segments=48, ring_count=24)
add(None, "gold")
box((0.1, 0, 0.36), (0.16, 0.04, 0.26), "brass", 0.006)
for z in (0.265, 0.36, 0.455):
    box((0.2, 0, z), (0.09, 0.04, 0.05), "brass", 0.006)
group(st, (xs["ltr"], 0.36, Z), math.radians(22), 1.14)

# ---- Privilege: a membership card standing in a block (a lotus, no brand) ----
st = set(scene.objects)
box((0, 0, 0.07), (0.62, 0.3, 0.14), "stone", 0.014)
card = set(scene.objects)
box((0, 0, 0), (0.54, 0.02, 0.86), "plum", 0.0)
c = bpy.context.object
c.modifiers["wn"].show_render = False
tube([(sx * 0.272, -0.002, sz * 0.43) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))], 0.008, "gold", True)
for k in range(7):  # lotus petals
    a = math.radians(-66 + k * 22)
    pts = []
    L, W = 0.2 - abs(k - 3) * 0.012, 0.045
    for i in range(25):
        t = i / 24
        pts.append((math.sin(t * math.pi) * W * (1 - 0.25 * t), t * L))
    loop = pts + [(-x, z) for x, z in reversed(pts[1:-1])]
    tube([(x * math.cos(a) + z * math.sin(a), -0.016, -0.02 + z * math.cos(a) - x * math.sin(a)) for x, z in loop], 0.0042, "gold", True)
for i, w in enumerate((0.22, 0.15, 0.08)):
    tube([(-w, -0.016, -0.06 - i * 0.03), (w, -0.016, -0.06 - i * 0.03)], 0.003, "gold")
box((-0.16, -0.012, 0.31), (0.085, 0.008, 0.065), "gold", 0.004)
g = group(card, (0, 0, 0.53))
g.rotation_euler = (math.radians(-6), 0, 0)
group(st, (xs["privilege"], 0.36, Z), math.radians(20), 1.26)

# ---- Visa exemption: a passport and a rubber stamp ----
st = set(scene.objects)
pp = set(scene.objects)
box((0, 0, 0), (0.5, 0.05, 0.7), "cream", 0.012)
for y in (-0.03, 0.03):
    box((0, y, 0), (0.53, 0.012, 0.73), "navy", 0.02)
for rx in (0.3, 0.65, 1.0):
    tube([(0.12 * rx * math.cos(t * math.pi / 32), -0.039, 0.05 + 0.12 * math.sin(t * math.pi / 32)) for t in range(64)], 0.003, "gold", True)
for z in (-0.055, 0, 0.055):
    w = math.sqrt(0.12**2 - z * z)
    tube([(-w, -0.039, 0.05 + z), (w, -0.039, 0.05 + z)], 0.003, "gold")
text("PASSPORT", (0, -0.038, -0.2), 0.066, "gold")
g = group(pp, (-0.07, 0.06, 0.4))
g.rotation_euler = (math.radians(-13), 0, math.radians(14))
box((-0.05, 0.2, 0.2), (0.3, 0.05, 0.4), "stone", 0.01, (math.radians(-13), 0, math.radians(14)))
box((0.3, -0.16, 0.05), (0.2, 0.15, 0.06), "wood", 0.014)
box((0.3, -0.16, 0.012), (0.21, 0.16, 0.024), "black", 0.004)
lathe((0.3, -0.16, 0.08), [(0.0, 0), (0.05, 0), (0.05, 0.02), (0.025, 0.05), (0.022, 0.1), (0.05, 0.15), (0.066, 0.2), (0.06, 0.245), (0.035, 0.275), (0.0, 0.28)], "wood")
group(st, (xs["visa-exempt"], 0.34, Z), math.radians(-4), 1.2)

# ---- Retirement: a sling deck chair ----
st = set(scene.objects)
R = 0.02
for x in (-0.27, 0.27):
    tube([(x, -0.36, 0.02), (x, 0.36, 0.98)], R, "wood")
for x in (-0.225, 0.225):
    tube([(x, 0.4, 0.02), (x, -0.42, 0.46)], R, "wood")
for x in (-0.31, 0.31):
    tube([(x, 0.1, 0.02), (x, 0.2, 0.74)], R * 0.8, "wood")
for y, z, w in ((0.36, 0.98, 0.29), (-0.36, 0.04, 0.29), (-0.42, 0.46, 0.25), (0.4, 0.04, 0.25)):
    tube([(-w, y, z), (w, y, z)], R, "wood")
N, K = 40, 10
A, B, C = Vector((0, 0.35, 1.0)), Vector((0, 0.02, 0.05)), Vector((0, -0.42, 0.485))
for k in range(K):
    me = bpy.data.meshes.new("sling")
    x0, x1 = -0.205 + 0.41 * k / K, -0.205 + 0.41 * (k + 1) / K
    vs = []
    for i in range(N + 1):
        t = i / N
        p = (1 - t) ** 2 * A + 2 * (1 - t) * t * B + t * t * C
        vs += [(x0, p.y, p.z), (x1, p.y, p.z)]
    me.from_pydata(vs, [], [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(N)])
    o = bpy.data.objects.new("sling", me)
    scene.collection.objects.link(o)
    add(o, "jade" if k % 2 else "canvas")
    o.modifiers.new("s", "SOLIDIFY").thickness = 0.008
group(st, (xs["retirement"] + 0.03, 0.38, Z), math.radians(48), 0.9)

# ---- light ----
scene.world = bpy.data.worlds.new("w")
scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = rgb("#6FB9B4")
bg.inputs[1].default_value = 0.10


def lamp(kind, loc, target, energy, color, **kw):
    d = bpy.data.lights.new("l", kind)
    d.energy, d.color = energy, rgb(color)[:3]
    for k, v in kw.items():
        setattr(d, k, v)
    o = bpy.data.objects.new("l", d)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


wash = lamp("AREA", (-5, -6, 6.5), (0, 0, 1.8), 520, "#FFE3B8", shape="RECTANGLE", size=5, size_y=3)
rim = lamp("AREA", (6, -5, 5), (0, 0, 1.6), 160, "#8FE0DA", shape="RECTANGLE", size=4, size_y=3)
DIM, FULL = 0.22, 1.0
spots = {}
for s, x in xs.items():
    top = lamp("SPOT", (x, 0.16, Z0 + NH - 0.45), (x, 0.4, Z0), 120, "#FFE0AE", spot_size=math.radians(78), spot_blend=0.8, shadow_soft_size=0.12)
    key = lamp("AREA", (x - 0.5, -1.5, 2.6), (x, 0.4, 1.1), 11, "#FFF0D6", shape="DISK", size=0.7)
    key.data.spread = math.radians(60)
    back = lamp("AREA", (x, 0.5, Z0 + 0.16), (x, 0.84, 1.6), 9, "#FFD9A0", shape="RECTANGLE", size=0.7, size_y=0.1)
    spots[s] = [(l, l.data.energy) for l in (top, key, back)]

# ---- camera ----
cam_d = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
cam_d.sensor_width = 36
WALL = (Vector((0, -10.6, 1.62)), Vector((0, 0, 1.5)), 42)


def aim(loc, target, lens):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam_d.lens = lens


def levels(on, w=1.0):
    """on: {slug: level 0..1}; w: level of the room light"""
    for s, ls in spots.items():
        for l, e in ls:
            l.data.energy = e * on.get(s, 0)
    wash.data.energy, rim.data.energy = 520 * w, 160 * w


def detail(s):
    x = xs[s]
    return Vector((x - 0.78, -4.7, 1.62)), Vector((x - 0.78, 0, 1.56)), 42


r = scene.render
r.engine = "CYCLES"
cy = scene.cycles
cy.samples, cy.use_denoising, cy.use_adaptive_sampling = SAMPLES, True, True
cy.adaptive_threshold = 0.02
cy.max_bounces = 8
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"
    pr.get_devices()
    for d in pr.devices:
        d.use = True
    cy.device = "GPU"
except Exception as e:
    print("CPU render:", e)
scene.view_settings.view_transform = "AgX"
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        pass
scene.view_settings.exposure = 0.35
r.use_persistent_data = True
r.image_settings.file_format = "PNG"
r.resolution_x, r.resolution_y = 2400, 1350


def shot(name):
    r.filepath = os.path.join(out, name + ".png")
    if os.path.exists(r.filepath):
        return  # resumable: delete the file to render it again
    bpy.ops.render.render(write_still=True)


kind, _, slug = job.partition(":")
if kind == "wall":
    aim(*WALL)
    levels({s: DIM for s in SLUGS})
    shot("wall")
elif kind == "lit":
    aim(*WALL)
    levels({s: FULL for s in SLUGS})
    shot("lit")
elif kind == "detail":
    aim(*detail(slug))
    levels({slug: FULL}, 0.3)
    shot("detail-" + slug)
elif kind == "tall":
    r.resolution_x, r.resolution_y = 900, 1500
    aim((xs[slug], -6.6, 1.6), (xs[slug], 0, 1.52), 60)
    cam_d.sensor_fit = "VERTICAL"
    cam_d.sensor_height, cam_d.lens = 24, 45
    levels({slug: FULL}, 0.6)
    shot("tall-" + slug)
elif kind == "dolly":
    r.resolution_x, r.resolution_y = 1600, 900
    r.use_motion_blur, r.motion_blur_shutter = True, 0.6
    a, b = WALL, detail(slug)
    for f in range(FRAMES):
        t = f / (FRAMES - 1)
        e = t * t * t * (t * (6 * t - 15) + 10)  # smootherstep
        aim(a[0].lerp(b[0], e), a[1].lerp(b[1], e), a[2] + (b[2] - a[2]) * e)
        for path in ("location", "rotation_euler"):
            cam.keyframe_insert(path, frame=f + 1)
    for f in range(FRAMES):
        t = f / (FRAMES - 1)
        scene.frame_set(f + 1)
        levels({s: FULL if s == slug else DIM * max(0, 1 - t * 1.6) for s in SLUGS}, 1 - 0.7 * t)
        shot(f"{slug}-{f:03d}")
