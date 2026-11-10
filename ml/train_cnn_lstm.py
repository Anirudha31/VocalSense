"""CNN-LSTM training scaffold for sequence-level speech emotion recognition."""
import torch
from torch import nn
class CNNLSTM(nn.Module):
 def __init__(self,n_classes=8):
  super().__init__();self.cnn=nn.Sequential(nn.Conv2d(1,32,3,padding=1),nn.ReLU(),nn.MaxPool2d(2),nn.Conv2d(32,64,3,padding=1),nn.ReLU())
  self.rnn=nn.LSTM(64,128,batch_first=True);self.fc=nn.Linear(128,n_classes)
 def forward(self,x):
  z=self.cnn(x);z=z.mean(dim=2).transpose(1,2);z,_=self.rnn(z);return self.fc(z[:,-1])
if __name__=="__main__": print("CNN-LSTM scaffold ready. Train and evaluate before publishing metrics.")
