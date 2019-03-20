from __future__ import print_function
import cv2
from random import randint
from xml.dom import minidom
import xml.etree.cElementTree as ET
import json, sys
import numpy as np
import base64
from PIL import Image
from StringIO import StringIO

# def process(frame):
#     print("11111")
#     print(type("a"))
#     print("222222")
#     print("json", frame)
#     sys.stdout.flush()
    
# data = sys.argv[3]
# argument = data
# functionName = sys.argv[1] + "(" + sys.argv[2] + ")"
# # functionName = sys.argv[1]
# exec(functionName)
# print(functionName)
# print("--------------------")
# sys.stdout.flush()

#Read data from stdin
def read_in():
    print("read args")
    lines = sys.stdin.readlines()
    #Since our input would only be having one line, parse our JSON data from that
    return json.loads(lines[0])


def readb64(base64_string):
    sbuf = StringIO()
    sbuf.write(base64.b64decode(base64_string))
    pimg = Image.open(sbuf)
    return cv2.cvtColor(np.array(pimg), cv2.COLOR_RGB2BGR)

def collectImage(rows,cols, imencode):
    print("collect image")
    base64data = imencode.replace('data:image/jpeg;base64','').replace('data:image/png;base64','')
    src = readb64(imencode)
    cv2.imwrite("test123.png", src)
    return src


trackerTypes = ['BOOSTING', 'MIL', 'KCF','TLD', 'MEDIANFLOW', 'GOTURN', 'MOSSE', 'CSRT']
 
def createTrackerByName(trackerType):
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

def trackerInit(rects, multiTracker, frame):
    bboxes = []
    # multiTrack = cv2.MultiTracker_create()
    print("-------", multiTracker)
    # print(len(rects))
    # print(type(rects))
    # print(type(bboxes))
    for val in rects:
        rect = (val["x"], val["y"], val["width"], val["height"])
        print("val", val)
        bboxes.append(rect)
    # print("-------")
    print("bboxes", bboxes)
    for bbox in bboxes:
        print("for in bboxes")
        multiTracker.add(createTrackerByName(trackerTypes[2]), frame, bbox)
    print("-------------")
    print("multiTrack", multiTracker.getObjects())
    print("multiTrack size", multiTracker.getObjects().size)
    print("multiTrack len", len(multiTracker.getObjects()))
    print("************")

def process(frame, multiTracker):
    print("!************!")
    success, boxes = multiTracker.update(frame)
    print("!!!!!success to update", success)
    for i, newbox in enumerate(boxes):
        # print("frame", dir(frame))
        print("!************!")
        p1 = (int(newbox[0]), int(newbox[1]))
        print("p1!************!")
        p2 = (int(newbox[0] + newbox[2]), int(newbox[1] + newbox[3]))
        print("p2!************!")
        cv2.rectangle(frame, p1, p2, (randint(0, 255), randint(0, 255), randint(0, 255)), 2, 1)
        print("cv rect!************!")
        print("im show!************!")
    cv2.imshow('MultiTracker', frame)
    cv2.waitKey(800)
    main()
import pickle

multiTracker = cv2.MultiTracker_create()
prevMultiTracker = multiTracker
count = 0
print("init count")
def main():
    global count
    global multiTracker
    global prevMultiTracker
    # get our data as an array from read_in()
    if count is 0:
        with open('company_data.pkl', 'wb') as output:
            pickle.dump(multiTracker, output, pickle.HIGHEST_PROTOCOL)
            prevMultiTracker = multiTracker
    if count is 1:
        with open('company_data.pkl', 'rb') as input:
            multiTracker = pickle.load(input)
            print("check equal trakckers")
    
    count += 1
    while True:
        print("multi ref", multiTracker)
        print("count =====", count)
        lines = read_in()
        imencode = lines.get("imencode")
        rows = lines.get("rows")
        cols = lines.get("cols")
        frame = collectImage(rows, cols, imencode)
        rects = lines.get("rects")
        if count == 0:
            trackerInit(rects, multiTracker, frame)
        # print(type(lines.get("rects")))
        # print("main", rects)
        # print(type(rects))
        
        # with open('track_data.pkl', 'wb') as output:
        #     pickle.dump(multiTracker, output, pickle.HIGHEST_PROTOCOL)
    # else:
    #     with open('track_data.pkl', 'rb') as input:
    #         multiTracker = pickle.load(input)
    #         print("=================")                 

        process(frame, multiTracker)
    # print("rects", rects)
    # print("name", rects[0]["name"])



#start process
if __name__ == '__main__':
    print("\nstart")
    main()