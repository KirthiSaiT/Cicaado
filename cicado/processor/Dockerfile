FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y \
        python3 \
        python3-pip \
        awscli \
        binwalk \
        foremost \
        steghide \
        outguess \
        exiftool \
        pngcheck \
        ruby \
        ruby-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN gem install zsteg

RUN pip3 install --break-system-packages flask boto3

WORKDIR /app

COPY . .

EXPOSE 5000

CMD ["python3", "app.py"]
