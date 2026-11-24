"""Thailand as a carved relief on dark water, three cities lit. Outline: Natural Earth 110m (public domain).
Run: Blender -b --factory-startup -P blender/thaimap.py -- <out_dir> <job> [samples]
Jobs: map | lit | near:<slug> | dolly:<slug>
"""
import bpy, sys, math, os, json, random
import numpy as np
from mathutils import Vector, noise

out, job = sys.argv[sys.argv.index("--") + 1 :][:2]
args = sys.argv[sys.argv.index("--") + 3 :]
SAMPLES = int(args[0]) if args else 96
FRAMES = 34
HERE = os.path.dirname(os.path.abspath(__file__))
LON0, LAT0, KX = 101.0, 13.2, math.cos(math.radians(13.2))
CITY = {"bangkok": (100.52, 13.82), "chiang-mai": (98.98, 18.75), "phuket": (98.2, 7.8)}
XY = lambda lon, lat: ((lon - LON0) * KX, lat - LAT0)
random.seed(7)


def rgb(h):
    c = [int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1,)


for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
scene = bpy.context.scene


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, emit=0.0, bump=0.0, bscale=10):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = rgb(color)
    p.inputs["Roughness"].default_value, p.inputs["Metallic"].default_value = rough, metal
    p.inputs["Coat Weight"].default_value = coat
    if emit:
        p.inputs["Emission Color"].default_value = rgb(color)
        p.inputs["Emission Strength"].default_value = emit
    if bump:
        tc, n, b = (nt.nodes.new(t) for t in ("ShaderNodeTexCoord", "ShaderNodeTexNoise", "ShaderNodeBump"))
        n.inputs["Scale"].default_value, n.inputs["Detail"].default_value = bscale, 6
        b.inputs["Strength"].default_value, b.inputs["Distance"].default_value = bump, 0.03
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        nt.links.new(n.outputs[0], b.inputs["Height"])
        nt.links.new(b.outputs[0], p.inputs["Normal"])
    return m


M = dict(
    sea=mat("sea", "#0E4A50", 0.12, bump=0.22, bscale=5),
    gold=mat("gold", "#E7B04A", 0.25, 1.0),
    ivory=mat("ivory", "#F5EBD7", 0.45),
    glass=mat("glass", "#FFC56B", 0.3, emit=1.1),
    blue=mat("blue", "#BFE0E2", 0.15, coat=0.6),
    trunk=mat("trunk", "#9A6A3D", 0.7),
    palm=mat("palm", "#2F8A56", 0.6),
    coral=mat("coral", "#F0684A", 0.4),
    sand=mat("sand", "#F4DFB4", 0.8),
)

# relief: celadon lowland -> jade hills -> gilded peaks
land = mat("land", "#8FC7A6", 0.55, coat=0.15, bump=0.5, bscale=22)
nt = land.node_tree
p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
geo, sep, ramp = (nt.nodes.new(t) for t in ("ShaderNodeNewGeometry", "ShaderNodeSeparateXYZ", "ShaderNodeValToRGB"))
mr = nt.nodes.new("ShaderNodeMapRange")
mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = 0.03, 0.8
nt.links.new(geo.outputs["Position"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
nt.links.new(mr.outputs[0], ramp.inputs[0])
cr = ramp.color_ramp
cr.elements[0].color, cr.elements[1].color = rgb("#E6D9AE"), rgb("#E9B850")
cr.elements[1].position = 1.0
for pos, col in ((0.07, "#A9D3B0"), (0.28, "#5FAE8C"), (0.62, "#2B7A66")):
    e = cr.elements.new(pos)
    e.color = rgb(col)
nt.links.new(ramp.outputs[0], p.inputs["Base Color"])


def chaikin(pts, n):
    for _ in range(n):
        q = []
        for a, b in zip(pts, pts[1:] + pts[:1]):
            q += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = q
    return pts


raw = json.load(open(os.path.join(HERE, "thailand.json")))[:-1]
main = chaikin([XY(*p) for p in raw], 3)
isl = lambda lon, lat, rx, ry: [(XY(lon, lat)[0] + rx * math.cos(a), XY(lon, lat)[1] + ry * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 40, endpoint=False)]
polys = [main, isl(98.2, 7.8, 0.34, 0.5), isl(100.03, 9.52, 0.14, 0.15), isl(102.35, 12.06, 0.1, 0.17), isl(98.72, 7.62, 0.06, 0.09)]

S = 0.028
gx, gy = np.arange(-5.6, 6.4, S), np.arange(-9.4, 9.2, S)
X, Y = np.meshgrid(gx, gy)
wob = np.vectorize(lambda x, y: noise.noise((x * 2.2, y * 2.2, 0)) * 0.09 + noise.noise((x * 7, y * 7, 3)) * 0.035)
WX, WY = X + wob(X, Y), Y + wob(X + 31, Y - 17)
inside = np.zeros(X.shape, bool)
dist = np.full(X.shape, 9.0)
for poly in polys:
    P = np.array(poly)
    Q = np.roll(P, -1, 0)
    hit = np.zeros(X.shape, bool)
    for (x1, y1), (x2, y2) in zip(P, Q):
        c = ((y1 > WY) != (y2 > WY)) & (WX < (x2 - x1) * (WY - y1) / (y2 - y1 + 1e-12) + x1)
        hit ^= c
        dx, dy = x2 - x1, y2 - y1
        t = np.clip(((WX - x1) * dx + (WY - y1) * dy) / (dx * dx + dy * dy + 1e-12), 0, 1)
        dist = np.minimum(dist, np.hypot(WX - x1 - t * dx, WY - y1 - t * dy))
    inside |= hit
ridged = np.vectorize(lambda x, y: noise.ridged_multi_fractal((x * 1.15, y * 1.15, 4.2), 0.9, 2.1, 6, 1.0, 2.0))
hill = np.clip(ridged(X, Y) - 0.55, 0, None)
lat, lon = Y + LAT0, X / KX + LON0
bump = lambda a, b, sx, sy: np.exp(-(((lon - a) / sx) ** 2) - ((lat - b) / sy) ** 2)
mask = np.clip(1.25 * bump(98.7, 19.0, 1.5, 1.9) + 1.0 * bump(98.9, 15.6, 0.75, 1.9) + 0.75 * bump(100.9, 18.6, 1.0, 1.5) + 0.55 * bump(101.7, 16.8, 0.6, 1.2) + 0.5 * bump(101.4, 14.4, 0.9, 0.25) + 0.6 * bump(99.3, 8.6, 0.5, 1.6) + 0.22 * bump(98.15, 8.0, 0.16, 0.2) + 0.4 * bump(101.6, 6.0, 0.6, 0.5) + 0.06, 0, 1.3)
for (clon, clat), r in ((CITY["bangkok"], 0.6), (CITY["chiang-mai"], 0.82), (CITY["phuket"], 0.16)):
    mask *= 1 - np.exp(-((((lon - clon) * KX) ** 2 + (lat - clat) ** 2) / r**2) ** 3)
edge = np.clip(dist / 0.07, 0, 1)
Z = np.where(inside, 0.015 + 0.085 * edge**0.6 + np.clip(dist / 0.35, 0, 1) * hill * mask * 0.34, -0.06)
ny, nx = X.shape
idx = np.arange(nx * ny).reshape(ny, nx)
keep = inside[:-1, :-1] | inside[1:, :-1] | inside[:-1, 1:] | inside[1:, 1:]
f = np.stack([idx[:-1, :-1][keep], idx[:-1, 1:][keep], idx[1:, 1:][keep], idx[1:, :-1][keep]], 1)
used, inv = np.unique(f, return_inverse=True)
me = bpy.data.meshes.new("land")
me.from_pydata(np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)[used].tolist(), [], inv.reshape(f.shape).tolist())
for q in me.polygons:
    q.use_smooth = True
o = bpy.data.objects.new("land", me)
scene.collection.objects.link(o)
me.materials.append(land)
# water: pale lagoon at the coast, deep teal offshore (vertex colour from the distance field)
sme = bpy.data.meshes.new("sea")
far = 60.0
SX, SY = X[::3, ::3].copy(), Y[::3, ::3].copy()
SX[:, 0], SX[:, -1], SY[0, :], SY[-1, :] = -far, far, -far, far
sn = np.arange(SX.size).reshape(SX.shape)
sme.from_pydata(np.stack([SX.ravel(), SY.ravel(), 0 * SX.ravel()], 1).tolist(), [], np.stack([sn[:-1, :-1].ravel(), sn[:-1, 1:].ravel(), sn[1:, 1:].ravel(), sn[1:, :-1].ravel()], 1).tolist())
ca = sme.color_attributes.new("shore", "FLOAT_COLOR", "POINT")
u = np.where(inside, 0, dist)[::3, ::3].ravel()[:, None]
c0, c1, c2 = (np.array(rgb(h)) for h in ("#8FE3CE", "#2FA6A0", "#0F6A70"))
k1, k2 = np.clip(u / 0.3, 0, 1) ** 0.8, np.clip((u - 0.2) / 0.9, 0, 1) ** 0.6
rim = np.zeros(SX.shape, bool)
rim[0, :] = rim[-1, :] = rim[:, 0] = rim[:, -1] = True
k2[rim.ravel()] = 1
col = (c0 * (1 - k1) + c1 * k1) * (1 - k2) + c2 * k2
ca.data.foreach_set("color", col.astype(np.float32).ravel())
so = bpy.data.objects.new("sea", sme)
scene.collection.objects.link(so)
snt = M["sea"].node_tree
att = snt.nodes.new("ShaderNodeVertexColor")
att.layer_name = "shore"
snt.links.new(att.outputs[0], next(n for n in snt.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"])
sme.materials.append(M["sea"])


def height(x, y):
    i, j = int(round((x - gx[0]) / S)), int(round((y - gy[0]) / S))
    return max(float(Z[j, i]), 0.0)


def mesh(op, m, **kw):
    getattr(bpy.ops.mesh, "primitive_" + op)(**kw)
    b = bpy.context.object
    b.data.materials.append(M[m])
    return b


def tower(x, y, w, h, m="ivory", d=None):
    z, d, rot = height(x, y), d or w, (0, 0, (x * 37) % 0.5)
    b = mesh("cube_add", m, size=1, location=(x, y, z + h / 2), rotation=rot)
    b.scale = (w, d, h)
    for k in range(int(h / 0.022)):
        g = mesh("cube_add", "glass", size=1, location=(x, y, z + 0.016 + k * 0.022), rotation=rot)
        g.scale = (w * 1.02, d * 1.02, 0.0045)
    c = mesh("cube_add", "gold", size=1, location=(x, y, z + h + 0.006), rotation=rot)
    c.scale = (w * 0.6, d * 0.6, 0.012)


def villa(x, y, w):
    z = height(x, y)
    b = mesh("cube_add", "ivory", size=1, location=(x, y, z + w * 0.3))
    b.scale = (w, w * 0.75, w * 0.6)
    mesh("cone_add", "coral", radius1=w * 0.85, radius2=0.0, depth=w * 0.55, location=(x, y, z + w * 0.87), vertices=4, rotation=(0, 0, math.pi / 4))


def palm(x, y, h):
    z = height(x, y)
    t = mesh("cone_add", "trunk", radius1=h * 0.05, radius2=h * 0.03, depth=h, location=(x, y, z + h / 2), vertices=10)
    for k in range(8):
        a = k * math.pi / 4 + x * 9
        me = bpy.data.meshes.new("leaf")
        L, vs = h * 0.62, []
        for i in range(7):
            u = i / 6
            r, zz, w = u * L, h * (0.14 * math.sin(u * 2.2) - 0.3 * u * u), h * 0.085 * math.sin(math.pi * (0.12 + 0.88 * u))
            for s in (-1, 1):
                vs.append((r * math.cos(a) - s * w * math.sin(a), r * math.sin(a) + s * w * math.cos(a), zz))
        me.from_pydata(vs, [], [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(6)])
        me.materials.append(M["palm"])
        lf = bpy.data.objects.new("leaf", me)
        scene.collection.objects.link(lf)
        lf.location = (x, y, z + h)


def chedi(x, y, s):
    z = height(x, y)
    prof = [(1.0, 0), (1.0, 0.12), (0.82, 0.12), (0.82, 0.26), (0.66, 0.26), (0.66, 0.4), (0.56, 0.42), (0.55, 0.6), (0.5, 0.85), (0.36, 1.08), (0.2, 1.2), (0.26, 1.22), (0.26, 1.3), (0.17, 1.36), (0.13, 1.6), (0.075, 1.95), (0.03, 2.35), (0.0, 2.6)]
    N, vs, fs = 48, [], []
    for i in range(N):
        a = 2 * math.pi * i / N
        vs += [(r * math.cos(a) * s, r * math.sin(a) * s, h * s) for r, h in prof]
    n = len(prof)
    for i in range(N):
        j = (i + 1) % N
        fs += [(i * n + k, j * n + k, j * n + k + 1, i * n + k + 1) for k in range(n - 1)]
    me = bpy.data.meshes.new("chedi")
    me.from_pydata(vs, [], fs)
    me.materials.append(M["gold"])
    for q in me.polygons:
        q.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(32))
    c = bpy.data.objects.new("chedi", me)
    scene.collection.objects.link(c)
    c.location = (x, y, z)


bx, by = XY(*CITY["bangkok"])
spots, tries = [], 0
while len(spots) < 95 and tries < 6000:
    tries += 1
    a, r = random.random() * 6.28, abs(random.gauss(0, 0.42))
    x, y = bx + r * math.cos(a), by + 0.12 + r * math.sin(a) * 0.75
    if r < 0.95 and height(x, y) > 0.08 and all((x - q) ** 2 + (y - w) ** 2 > 0.075**2 for q, w in spots):
        spots.append((x, y))
        tower(x, y, random.uniform(0.03, 0.052), max(0.05, 0.62 * math.exp(-(r / 0.42) ** 2) * random.uniform(0.4, 1.0)), random.choice(("ivory", "ivory", "blue")), random.uniform(0.03, 0.052))
cx, cy_ = XY(*CITY["chiang-mai"])
chedi(cx, cy_, 0.24)
for q in range(4):
    a = q * math.pi / 2 + math.pi / 4
    chedi(cx + 0.34 * math.cos(a), cy_ + 0.34 * math.sin(a), 0.065)
for _ in range(46):
    a, r = random.random() * 6.28, random.uniform(0.44, 0.72)
    villa(cx + r * math.cos(a), cy_ + r * math.sin(a), random.uniform(0.035, 0.055))
for _ in range(70):
    a, r = random.random() * 6.28, random.uniform(0.42, 0.86)
    palm(cx + r * math.cos(a), cy_ + r * math.sin(a), random.uniform(0.07, 0.13))
px, py = XY(*CITY["phuket"])
for _ in range(22):
    a, r = random.random() * 6.28, math.sqrt(random.random()) * 0.42
    x, y = px + r * 0.62 * math.cos(a), py + r * math.sin(a)
    if height(x, y) > 0.04:
        palm(x, y, random.uniform(0.11, 0.22))
for dx, dy in ((-0.12, -0.27), (0.1, -0.2), (-0.16, -0.05), (0.14, 0.02), (0.0, -0.36)):
    villa(px + dx, py + dy, 0.07)
for dx, dy, rot in ((-0.62, -0.3, 0.4), (-0.75, 0.1, -0.2), (-0.35, -0.75, 1.2)):  # long-tail boats
    b = mesh("uv_sphere_add", "coral", radius=1, location=(px + dx, py + dy, 0.0), rotation=(0, 0, rot))
    b.scale = (0.02, 0.105, 0.026)
    b2 = mesh("cube_add", "ivory", size=1, location=(px + dx, py + dy, 0.034), rotation=(0, 0, rot))
    b2.scale = (0.03, 0.06, 0.005)

# light: a low gold sun from the west, a cool sky, one warm lamp per city
scene.world = bpy.data.worlds.new("w")
scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = rgb("#BFE3E0")
bg.inputs[1].default_value = 0.42

wnt = scene.world.node_tree
lp, cambg, mixs = wnt.nodes.new("ShaderNodeLightPath"), wnt.nodes.new("ShaderNodeBackground"), wnt.nodes.new("ShaderNodeMixShader")
cambg.inputs[0].default_value = rgb("#F6CFA0")
outw = next(n for n in wnt.nodes if n.type == "OUTPUT_WORLD")
wnt.links.new(lp.outputs["Is Camera Ray"], mixs.inputs[0])
wnt.links.new(bg.outputs[0], mixs.inputs[1])
wnt.links.new(cambg.outputs[0], mixs.inputs[2])
wnt.links.new(mixs.outputs[0], outw.inputs[0])


def lamp(kind, loc, target, energy, color, **kw):
    d = bpy.data.lights.new("l", kind)
    d.energy, d.color = energy, rgb(color)[:3]
    for k, v in kw.items():
        setattr(d, k, v)
    l = bpy.data.objects.new("l", d)
    scene.collection.objects.link(l)
    l.location = loc
    l.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return l


sun = lamp("SUN", (-6, -3, 5), (0, 0, 0), 3.4, "#FFD08C", angle=math.radians(3))
city = {}
for s, ll in CITY.items():
    x, y = XY(*ll)
    city[s] = lamp("SPOT", (x - 0.4, y - 0.6, 4.2), (x, y, 0.1), 900, "#FFD08A", spot_size=math.radians(26), spot_blend=0.9, shadow_soft_size=0.3)

cam_d = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
cam_d.sensor_width = 36
MAP = (Vector((-2.2, -17.0, 14.2)), Vector((-2.2, -0.75, 0)), 38)
NEAR = {"bangkok": ((0.9, -2.0, 0.72), (0, 0.1, 0.24)), "chiang-mai": ((0.8, -1.75, 0.7), (0, 0.05, 0.34)), "phuket": ((-1.0, -1.7, 0.6), (0, 0, 0.12))}


def near(s):
    x, y = XY(*CITY[s])
    a, b = NEAR[s]
    return Vector((x + a[0], y + a[1], a[2])), Vector((x + b[0], y + b[1], b[2])), 40


def aim(loc, target, lens):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam_d.lens = lens


def levels(on, day=1.0):
    for s, l in city.items():
        l.data.energy = 700 * on.get(s, 0)
    sun.data.energy = 3.4 * day
    bg.inputs[1].default_value = 0.42 * day


r = scene.render
r.engine = "CYCLES"
cy = scene.cycles
cy.samples, cy.use_denoising, cy.use_adaptive_sampling, cy.adaptive_threshold = SAMPLES, True, True, 0.02
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
scene.view_settings.exposure = 0.3
r.use_persistent_data = True
r.image_settings.file_format = "PNG"
r.resolution_x, r.resolution_y = 2400, 1350


def shot(name):
    r.filepath = os.path.join(out, name + ".png")
    if os.path.exists(r.filepath):
        return  # resumable: delete the file to render it again
    bpy.ops.render.render(write_still=True)


kind, _, slug = job.partition(":")
if kind in ("map", "lit"):
    aim(*MAP)
    levels({s: 1.0 if kind == "lit" else 0.12 for s in CITY}, 0.8)
    shot("map" if kind == "map" else "map-lit")
elif kind in ("tall", "tall-lit"):
    r.resolution_x, r.resolution_y = 900, 1400
    aim(Vector((0, -17.0, 16.5)), Vector((0, -0.7, 0)), 38)
    levels({s: 1.0 if kind == "tall-lit" else 0.12 for s in CITY}, 0.8)
    shot("map-" + kind)
elif kind == "near":
    aim(*near(slug))
    levels({slug: 0.35}, 1.0)
    shot("near-" + slug)
elif kind == "dolly":
    r.resolution_x, r.resolution_y = 1280, 720
    r.use_motion_blur, r.motion_blur_shutter = True, 0.6
    a, b = MAP, near(slug)
    for fr in range(FRAMES):
        t = fr / (FRAMES - 1)
        e = t * t * t * (t * (6 * t - 15) + 10)
        aim(a[0].lerp(b[0], e), a[1].lerp(b[1], e), a[2] + (b[2] - a[2]) * e)
        for path in ("location", "rotation_euler"):
            cam.keyframe_insert(path, frame=fr + 1)
    for fr in range(FRAMES):
        t = fr / (FRAMES - 1)
        scene.frame_set(fr + 1)
        levels({s: (1 - 0.65 * t) if s == slug else 0.12 * (1 - t) for s in CITY}, 0.8 + 0.2 * t)
        shot(f"map-{slug}-{fr:03d}")
