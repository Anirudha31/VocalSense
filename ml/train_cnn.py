"""CNN training scaffold. Use this as the next experiment after establishing the SVM baseline."""
import torch
from torch import nn
class EmotionCNN(nn.Module):
 def __init__(self,n_classes=8):
  super().__init__();self.net=nn.Sequential(nn.Conv2d(1,32,3,padding=1),nn.ReLU(),nn.MaxPool2d(2),nn.Conv2d(32,64,3,padding=1),nn.ReLU(),nn.MaxPool2d(2),nn.Conv2d(64,128,3,padding=1),nn.ReLU(),nn.AdaptiveAvgPool2d((1,1)))
  self.fc=nn.Linear(128,n_classes)
 def forward(self,x): return self.fc(self.net(x).flatten(1))
if __name__=="__main__": print("CNN scaffold ready. Build speaker-independent train/validation/test splits before reporting metrics.")
