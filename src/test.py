import json
import cv2
import os
import numpy as np
import base64
import time
import logging
from flask import Flask, jsonify, request, Response, render_template, send_from_directory, redirect, url_for, session
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit
from werkzeug import secure_filename
from PIL import Image
from StringIO import StringIO
from datetime import datetime


DIR = './'
with open('data.json') as f:
    data = json.load(f)
    DIR = data['dir']
app = Flask(__name__, static_folder=DIR, template_folder=DIR, static_url_path='')
socketio = SocketIO(app)
count = 0
isInit = False
rects = []
globRects = []
trackerTypes = ['BOOSTING', 'MIL', 'KCF','TLD', 'MEDIANFLOW', 'GOTURN', 'MOSSE', 'CSRT']
multiTracker = cv2.MultiTracker_create()
APP__ROOT = os.path.dirname(os.path.abspath(__file__))

def readb64(base64_string):
    sbuf = StringIO()
    sbuf.write(base64.b64decode(base64_string))
    pimg = Image.open(sbuf)
    return cv2.cvtColor(np.array(pimg), cv2.COLOR_RGB2BGR)

@app.route('/', methods=['GET', 'POST'])
@cross_origin()
def home():
    global rects
    global count
    global multiTracker
    multiTracker = cv2.MultiTracker_create()
    count = 0
    rects[:] = []
    return render_template("index.html")

@app.route('/track',methods = ['POST'])
@cross_origin()
def data():
    global trackerTypes
    url = request.json["data"]["url"]
    frame = readb64(url)
    global multiTracker
    global count
    global rects
    global globRects
    global isInit
    if isInit is False:
        globRects = rects
        isInit = True
    print("globrectsdata ----------------->", globRects)
    print("rects in data ----------------->", rects)
    bboxes = []
    #print("rects ------------>", len(rects))
    # print("proc start")
    print("***********",multiTracker.getObjects)
    if count == 0:
        print("count is 0--------------------->")
        # multiTracker = cv2.MultiTracker_create()
        for val in rects:
            rect = (val["x"], val["y"], val["width"], val["height"])
            bboxes.append(rect)
        for bbox in bboxes:
            print("multitracker add")
            multiTracker.add(createTrackerByName(trackerTypes[2]), frame, bbox)
        count += 1
    # print("process & update")
    
    success, boxes = multiTracker.update(frame)
    # print("bboxes -------->", bboxes)
    # print("success ------>", success)
    rectParam = []
    rectForReturn = []
    # print("boxes", boxes)
    # print("len(boxes)", len(boxes))
    for i, newbox in enumerate(boxes):
        p1 = (int(newbox[0]), int(newbox[1]))
        p2 = (int(newbox[0] + newbox[2]), int(newbox[1] + newbox[3]))
        # print("newbox -------->", newbox)
        # cv2.rectangle(frame, p1, p2, (0,0,255), 2, 1)
        rectParam.append(newbox)
    # print("rectParam[0]********************>", rectParam[0][0])
    for rect in rectParam:
        rectForReturn.append((int(rect[0]), int(rect[1]), int(rect[2]), int(rect[3])))
        # print("rect ------------->", rect)
        # print("type(rect) ------->", type(rect))
    print("rectForReturn ===================>", rectForReturn)
    # print()
    #print("rectForReturn ===================>", len(rectForReturn))
    return json.dumps({'success':success, "rects":rectForReturn})


# def example():
#     tracks = []
#     bboxes = []
#     if coutn == 0:
#         for val in rects:
#             rect = (val["x"], val["y"], val["width"], val["height"])
#             bboxes.append(rect)
#         count +=1
#         for bbox in bboxes:
#             vector.append(createTrackerByName[trackerTypes[2]])
#     for track in vector:
#         success, bbox = track.update
#         p1 = bbox[0]m bbox[1]
#         p2 = bbox[0] + bbox[2], bbox[0] + bbox[3]
#         print(success, bbox)
#         if success is True:
#             return "true"
#         else:
#             return 'false'        


@app.route('/upload', methods = ['GET', 'POST'])
@cross_origin()
def upload_file():
    if request.method == 'POST':
        print("POST")
    file = request.files['file']
    target = os.path.join(DIR)
    if not os.path.isdir(target):
        os.mkdir(target)
    fileName = datetime.now().strftime("%Y%m%d-%H%M%S")
    destination = "/".join([target, fileName])
    file.save(destination)
    return json.dumps({"fileName":fileName})

@socketio.on('add-data')
@cross_origin()
def test_message(message):
    global rects
    global count
    print("connected", message)
    print(type(message))
    print("message ------->", message)
    rects = message
    print("rects --------->", rects)
    # print("**********", len(message))
    # emit('my response', '''json.dumps({'success':"success", "rects":"rectForReturn"})''')
    # print("-------------------------------")
    count = 0
    emit('log', {'data': 'ok'})
    return 'a'

# @socketio.on('add-data')
# @cross_origin()
# def test_message(message):
#     emit("message") 

def createTrackerByName(trackerType):
    global trackerTypes
    global multiTracker
    # Create a tracker based on tracker name
    if trackerType == trackerTypes[0]:
        tracker = cv2.TrackerBoosting_create()
    elif trackerType == trackerTypes[1]: 
        tracker = cv2.TrackerMIL_create()
    elif trackerType == trackerTypes[2]:
        tracker = cv2.TrackerKCF_create()
    elif trackerType == trackerTypes[3]:
        tracker = cv2.TrackerTLD_create()
    elif trackerType == trackerTypes[4]:
        tracker = cv2.TrackerMedianFlow_create()
    elif trackerType == trackerTypes[5]:
        tracker = cv2.TrackerGOTURN_create()
    elif trackerType == trackerTypes[6]:
        tracker = cv2.TrackerMOSSE_create()
    elif trackerType == trackerTypes[7]:
        tracker = cv2.TrackerCSRT_create()
    else:
        tracker = None
        print('Incorrect tracker name')
        print('Available trackers are:')
        for t in trackerTypes:
            print(t)
    return tracker

if __name__ == '__main__':
    app.secret_key = os.urandom(24)
    # threaded=True
    app.run(threaded=True, debug=True, host='0.0.0.0', port=8000)
    # http_server = WSGIServer(('', 8000), app)
    # http_server.serve_forever()


